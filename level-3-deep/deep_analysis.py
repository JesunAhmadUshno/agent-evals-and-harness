"""Failure taxonomy and contamination hygiene for Level 3 Deep.

This module imports the Level 2 Build eval suite and runs it
again, attempt by attempt, so every failure can be classified
from its own trajectory log. No Build result is copied by hand.

The agent under test is a toy agent. It is not an LLM, it is
not a real agent, it calls no API, and it does not learn. The
taxonomy in this module describes that toy agent only.

Classification rules are operational and are applied in a fixed
precedence order (see DEEP-SPEC.md): loop_trap, excess_steps,
truncated_plan, tool_misuse, silent_wrong_answer, then
other_wrong_answer as a fallback. Every failed attempt gets
exactly one primary class, so class counts sum to the number of
failed attempts.

Only the Python standard library is used.
"""
import hashlib
import json
import os
import random
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(os.path.dirname(HERE), "level-2-build")
sys.path.insert(0, BUILD)

from eval_suite import (  # noqa: E402
    ATTEMPTS_PER_TASK, MASTER_SEEDS, VARIANTS, ConfigurableToyAgent,
    score_attempt, validate_tasks,
)

TAXONOMY_CLASSES = (
    "loop_trap",
    "excess_steps",
    "truncated_plan",
    "tool_misuse",
    "silent_wrong_answer",
    "other_wrong_answer",
)

NEAR_DUPLICATE_THRESHOLD = 0.9
NEAR_NEIGHBOUR_THRESHOLD = 0.8


def attempt_seed(master_seed, variant_name, task_id, attempt_index):
    """The same seed string the Build suite uses per attempt."""
    return "%s:%s:%s:%d" % (master_seed, variant_name, task_id,
                            attempt_index)


def classify_failure(variant_name, task, run):
    """Assign exactly one primary failure class to a failed run.

    Uses only the run record, its trajectory log, the task plan
    length, and the variant configuration, in precedence order.
    """
    plan_len = len(task["plan"])
    traj_keys = [
        (entry["tool"], json.dumps(entry["args"], sort_keys=True))
        for entry in run["trajectory"] if entry["tool"] != "verifier"
    ]
    repeats = Counter(traj_keys)
    if repeats and max(repeats.values()) >= 3:
        return "loop_trap"
    if run["steps"] > plan_len + 1:
        return "excess_steps"
    if not VARIANTS[variant_name]["planner"] and plan_len > 1:
        return "truncated_plan"
    if run["outcome"] == "failure" and run["failure_label"]:
        return "tool_misuse"
    if (run["outcome"] == "success" and run["slip"]
            and not run["slip_caught"]):
        return "silent_wrong_answer"
    return "other_wrong_answer"


def run_all_attempts(dev_tasks, heldout_tasks):
    """Run every variant, seed, task, and attempt; classify fails.

    Returns a summary dict with totals, taxonomy counts overall,
    per variant, and per task set. Deterministic: all randomness
    comes from the Build per-attempt seed strings.
    """
    tagged = ([(t, "dev") for t in dev_tasks]
              + [(t, "heldout") for t in heldout_tasks])
    validate_tasks(dev_tasks)
    validate_tasks(heldout_tasks)
    total = 0
    passed = 0
    counts = Counter()
    by_variant = {}
    by_set = {"dev": Counter(), "heldout": Counter()}
    fails_by_variant = Counter()
    fails_by_set = Counter()
    total_by_variant = Counter()
    for variant_name in VARIANTS:
        agent = ConfigurableToyAgent(VARIANTS[variant_name])
        by_variant[variant_name] = Counter()
        for master_seed in MASTER_SEEDS:
            for task, set_name in tagged:
                for a in range(ATTEMPTS_PER_TASK):
                    rng = random.Random(attempt_seed(
                        master_seed, variant_name, task["id"], a))
                    run = agent.run(task, rng)
                    total += 1
                    total_by_variant[variant_name] += 1
                    if score_attempt(task, run):
                        passed += 1
                    else:
                        cls = classify_failure(variant_name, task, run)
                        counts[cls] += 1
                        by_variant[variant_name][cls] += 1
                        by_set[set_name][cls] += 1
                        fails_by_variant[variant_name] += 1
                        fails_by_set[set_name] += 1
    failed = total - passed
    taxonomy = {cls: int(counts.get(cls, 0)) for cls in TAXONOMY_CLASSES}
    return {
        "total_attempts": total,
        "passed_attempts": passed,
        "failed_attempts": failed,
        "taxonomy_counts": taxonomy,
        "taxonomy_sum": sum(taxonomy.values()),
        "taxonomy_sum_matches_failures": (
            sum(taxonomy.values()) == failed),
        "taxonomy_by_variant": {
            name: {cls: int(by_variant[name].get(cls, 0))
                   for cls in TAXONOMY_CLASSES}
            for name in VARIANTS},
        "taxonomy_by_set": {
            name: {cls: int(by_set[name].get(cls, 0))
                   for cls in TAXONOMY_CLASSES}
            for name in ("dev", "heldout")},
        "failed_by_variant": {name: int(fails_by_variant[name])
                              for name in VARIANTS},
        "total_by_variant": {name: int(total_by_variant[name])
                             for name in VARIANTS},
        "failed_by_set": {name: int(fails_by_set[name])
                          for name in ("dev", "heldout")},
    }


def _fingerprint(task):
    return json.dumps({
        "category": task["category"],
        "plan": task["plan"],
        "expected_outcome": task["expected_outcome"],
        "expected_answer": task.get("expected_answer"),
        "expected_failure_label": task.get("expected_failure_label"),
    }, sort_keys=True)


def _fingerprint_tokens(task):
    tokens = {
        ("category", task["category"]),
        ("outcome", task["expected_outcome"]),
        ("answer", json.dumps(task.get("expected_answer"))),
        ("failure_label", str(task.get("expected_failure_label"))),
    }
    for step in task["plan"]:
        tokens.add(("tool", step["tool"]))
        for arg in step["args"]:
            tokens.add(("arg", json.dumps(arg)))
    return tokens


def _jaccard(a, b):
    union = a | b
    if not union:
        return 1.0
    return len(a & b) / len(union)


def _duplicates(values):
    return len(values) - len(set(values))


def agent_class_segment(source_text):
    """The ConfigurableToyAgent class source segment only.

    The scorer and validator in the same module legitimately read
    scoring keys; the toy agent class must not. The check is
    scoped to the class segment, which is the agent itself.
    """
    start = source_text.index("class ConfigurableToyAgent")
    end = source_text.index("\ndef validate_tasks", start)
    return source_text[start:end]


def hygiene_report(dev_tasks, heldout_tasks, build_dir):
    """Compute the contamination hygiene report in code."""
    dev_ids = [t["id"] for t in dev_tasks]
    held_ids = [t["id"] for t in heldout_tasks]
    dev_fp = [_fingerprint(t) for t in dev_tasks]
    held_fp = [_fingerprint(t) for t in heldout_tasks]
    dev_plans = [json.dumps(t["plan"], sort_keys=True) for t in dev_tasks]
    held_plans = [json.dumps(t["plan"], sort_keys=True)
                  for t in heldout_tasks]

    pairs = []
    for d_task in dev_tasks:
        d_tok = _fingerprint_tokens(d_task)
        for h_task in heldout_tasks:
            sim = _jaccard(d_tok, _fingerprint_tokens(h_task))
            pairs.append((round(sim, 4), d_task["id"], h_task["id"]))
    pairs.sort(reverse=True)
    max_sim, max_dev, max_held = pairs[0]

    def no_id(task):
        clone = dict(task)
        clone.pop("id")
        return json.dumps(clone, sort_keys=True)

    all_texts = [json.dumps(t, sort_keys=True)
                 for t in list(dev_tasks) + list(heldout_tasks)]

    with open(os.path.join(build_dir, "eval_suite.py"),
              encoding="utf-8") as f:
        source_text = f.read()
    segment = agent_class_segment(source_text)
    banned = ("expected_answer", "expected_failure_label",
              "tasks_dev", "tasks_heldout")
    segment_banned = {name: segment.count(name) for name in banned}
    segment_held_ids = {tid: segment.count(tid) for tid in held_ids}

    # Behavioural check: mutating scoring keys must not change a
    # run of the toy agent (full variant), under the same seed.
    agent = ConfigurableToyAgent(VARIANTS["full"])
    unchanged = 0
    for task in heldout_tasks:
        seed = "hygiene:%s" % task["id"]
        before = agent.run(task, random.Random(seed))
        mutated = dict(task, expected_answer="__SENTINEL__",
                       expected_failure_label="__SENTINEL__")
        after = agent.run(mutated, random.Random(seed))
        same = (
            before["answer"] == after["answer"]
            and before["outcome"] == after["outcome"]
            and before["steps"] == after["steps"]
            and json.dumps(before["trajectory"], sort_keys=True)
            == json.dumps(after["trajectory"], sort_keys=True))
        if same:
            unchanged += 1

    def file_hash(name):
        with open(os.path.join(build_dir, name), "rb") as f:
            return hashlib.sha256(f.read()).hexdigest()

    with open(os.path.join(build_dir, "results_build.json"),
              encoding="utf-8") as f:
        build_results = json.load(f)
    held_hash = file_hash("tasks_heldout.json")
    dev_hash = file_hash("tasks_dev.json")

    dev_answers = {json.dumps(t.get("expected_answer"))
                   for t in dev_tasks}
    held_answers = {json.dumps(t.get("expected_answer"))
                    for t in heldout_tasks}

    checks = {
        "cross_set_pairs_compared": len(dev_tasks) * len(heldout_tasks),
        "id_overlap_count": len(set(dev_ids) & set(held_ids)),
        "exact_fingerprint_overlap_count": len(
            set(dev_fp) & set(held_fp)),
        "exact_plan_overlap_count": len(
            set(dev_plans) & set(held_plans)),
        "near_duplicate_pairs_at_or_above_0_9": sum(
            1 for sim, _, _ in pairs if sim >= NEAR_DUPLICATE_THRESHOLD),
        "near_neighbour_pairs_at_or_above_0_8": sum(
            1 for sim, _, _ in pairs
            if sim >= NEAR_NEIGHBOUR_THRESHOLD),
        "max_cross_set_jaccard": max_sim,
        "max_cross_set_pair": [max_dev, max_held],
        "dev_duplicate_ids": _duplicates(dev_ids),
        "dev_duplicate_fingerprints": _duplicates(dev_fp),
        "heldout_duplicate_ids": _duplicates(held_ids),
        "heldout_duplicate_fingerprints": _duplicates(held_fp),
        "all_task_texts": len(all_texts),
        "all_duplicate_full_texts": _duplicates(all_texts),
        "cross_set_duplicates_ignoring_id": len(
            {no_id(t) for t in dev_tasks}
            & {no_id(t) for t in heldout_tasks}),
        "agent_segment_banned_string_counts": segment_banned,
        "agent_segment_banned_string_total": sum(
            segment_banned.values()),
        "agent_segment_heldout_id_total": sum(
            segment_held_ids.values()),
        "behavioural_mutation_tasks_checked": len(heldout_tasks),
        "behavioural_mutation_runs_unchanged": unchanged,
        "heldout_file_sha256": held_hash,
        "heldout_hash_matches_build_record": (
            held_hash == build_results["heldout_file_sha256"]),
        "dev_file_sha256": dev_hash,
        "dev_hash_matches_build_record": (
            dev_hash == build_results["dev_file_sha256"]),
        "shared_distinct_expected_answer_values": len(
            dev_answers & held_answers),
        "shared_expected_answer_values": sorted(
            dev_answers & held_answers),
    }
    checks["all_exact_checks_zero"] = all([
        checks["id_overlap_count"] == 0,
        checks["exact_fingerprint_overlap_count"] == 0,
        checks["exact_plan_overlap_count"] == 0,
        checks["dev_duplicate_ids"] == 0,
        checks["dev_duplicate_fingerprints"] == 0,
        checks["heldout_duplicate_ids"] == 0,
        checks["heldout_duplicate_fingerprints"] == 0,
        checks["all_duplicate_full_texts"] == 0,
        checks["cross_set_duplicates_ignoring_id"] == 0,
        checks["agent_segment_banned_string_total"] == 0,
        checks["agent_segment_heldout_id_total"] == 0,
        checks["near_duplicate_pairs_at_or_above_0_9"] == 0,
    ])
    return checks


def full_report():
    """Run the taxonomy sweep and the hygiene report together."""
    def load(name):
        with open(os.path.join(BUILD, name), encoding="utf-8") as f:
            return json.load(f)

    dev = load("tasks_dev.json")
    heldout = load("tasks_heldout.json")
    taxonomy = run_all_attempts(dev, heldout)
    hygiene = hygiene_report(dev, heldout, BUILD)
    return {
        "scenario": "toy agent (not an LLM), failure taxonomy from "
                    "real runs of the Build eval suite, plus a "
                    "contamination hygiene report computed in code",
        "variants": list(VARIANTS),
        "master_seeds": MASTER_SEEDS,
        "attempts_per_task": ATTEMPTS_PER_TASK,
        "dev_tasks": len(dev),
        "heldout_tasks": len(heldout),
        "taxonomy_precedence": list(TAXONOMY_CLASSES),
        "taxonomy": taxonomy,
        "hygiene": hygiene,
    }
