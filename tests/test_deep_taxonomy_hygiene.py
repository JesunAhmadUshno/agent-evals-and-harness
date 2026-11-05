"""Unit tests for the Level 3 Deep taxonomy and hygiene report.

Hand-computed classifier cases plus integration checks against
the real Build task sets. The agent under test is a toy agent
(not an LLM); these tests describe that toy agent only.
"""
import json
import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, "level-2-build")
DEEP = os.path.join(ROOT, "level-3-deep")
sys.path.insert(0, DEEP)
sys.path.insert(0, BUILD)

from deep_analysis import (  # noqa: E402
    TAXONOMY_CLASSES,
    agent_class_segment,
    classify_failure,
    full_report,
    hygiene_report,
    run_all_attempts,
)


def load_build(name):
    with open(os.path.join(BUILD, name), encoding="utf-8") as f:
        return json.load(f)


def make_task(plan_len=1, **over):
    task = {"id": "T1", "category": "arithmetic", "difficulty": 1,
            "expected_outcome": "success", "expected_answer": 3,
            "expected_failure_label": None,
            "plan": [{"tool": "add", "args": [1, 2]}] * plan_len}
    task.update(over)
    return task


def make_run(**over):
    run = {"answer": 3, "outcome": "success", "failure_label": None,
           "steps": 1, "cost_units": 2, "slip": False,
           "slip_caught": False,
           "trajectory": [{"step": 1, "tool": "add", "args": [1, 2],
                           "result": 3, "error": None,
                           "failure_label": None, "cost_units": 2}]}
    run.update(over)
    return run


def entry(tool, args):
    return {"step": 1, "tool": tool, "args": args, "result": None,
            "error": None, "failure_label": None, "cost_units": 1}


class TestClassifierHandCases(unittest.TestCase):
    def test_loop_trap_three_identical_calls(self):
        run = make_run(steps=3, trajectory=[entry("lookup", ["k"])] * 3)
        self.assertEqual(classify_failure("full", make_task(), run),
                         "loop_trap")

    def test_planned_duplicate_two_calls_is_not_loop_trap(self):
        # D11 and H13 plan the same lookup twice. Two repeats fall
        # through to the slip rule instead of loop_trap.
        run = make_run(steps=3, slip=True, answer=9, trajectory=[
            entry("lookup", ["k"]), entry("lookup", ["k"]),
            entry("add", [4, 4])])
        self.assertEqual(
            classify_failure("full", make_task(plan_len=3), run),
            "silent_wrong_answer")

    def test_excess_steps(self):
        run = make_run(steps=5, trajectory=[entry("add", [1, 2]),
                                            entry("add", [3, 4])])
        self.assertEqual(
            classify_failure("full", make_task(plan_len=2), run),
            "excess_steps")

    def test_verifier_extra_step_is_not_excess(self):
        # Plan 1 plus 1 verifier step = 2 steps, which is allowed.
        run = make_run(steps=2, slip=True)
        self.assertEqual(classify_failure("full", make_task(), run),
                         "silent_wrong_answer")

    def test_truncated_plan(self):
        run = make_run(steps=1, answer=7)
        self.assertEqual(
            classify_failure("no_planner", make_task(plan_len=3), run),
            "truncated_plan")

    def test_truncated_beats_tool_misuse(self):
        run = make_run(outcome="failure", answer=None,
                       failure_label="memory_unavailable")
        self.assertEqual(
            classify_failure("minimal", make_task(plan_len=3), run),
            "truncated_plan")

    def test_tool_misuse(self):
        run = make_run(outcome="failure", answer=None,
                       failure_label="memory_unavailable", steps=3)
        self.assertEqual(
            classify_failure("no_memory", make_task(plan_len=3), run),
            "tool_misuse")

    def test_silent_wrong_answer(self):
        run = make_run(slip=True, slip_caught=False, answer=4)
        self.assertEqual(classify_failure("no_verifier", make_task(), run),
                         "silent_wrong_answer")

    def test_other_wrong_answer_fallback(self):
        run = make_run(answer=99)
        self.assertEqual(classify_failure("full", make_task(), run),
                         "other_wrong_answer")


class TestTaxonomyIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dev = load_build("tasks_dev.json")
        cls.held = load_build("tasks_heldout.json")
        cls.tax = run_all_attempts(cls.dev, cls.held)

    def test_attempt_arithmetic(self):
        # 5 variants times 5 seeds times 36 tasks times 5 attempts.
        self.assertEqual(self.tax["total_attempts"], 5 * 5 * 36 * 5)
        self.assertEqual(self.tax["total_attempts"], 4500)
        self.assertEqual(
            self.tax["passed_attempts"] + self.tax["failed_attempts"],
            self.tax["total_attempts"])

    def test_taxonomy_counts_sum_to_failures(self):
        counts = self.tax["taxonomy_counts"]
        self.assertEqual(set(counts), set(TAXONOMY_CLASSES))
        self.assertEqual(sum(counts.values()),
                         self.tax["failed_attempts"])
        self.assertTrue(self.tax["taxonomy_sum_matches_failures"])

    def test_measured_counts(self):
        # Locked measured values from the 2026-11-05 Deep run.
        self.assertEqual(self.tax["failed_attempts"], 1285)
        self.assertEqual(self.tax["taxonomy_counts"], {
            "loop_trap": 0, "excess_steps": 0, "truncated_plan": 1000,
            "tool_misuse": 100, "silent_wrong_answer": 185,
            "other_wrong_answer": 0})

    def test_by_variant_and_by_set_sum(self):
        for name, row in self.tax["taxonomy_by_variant"].items():
            self.assertEqual(sum(row.values()),
                             self.tax["failed_by_variant"][name])
        set_total = sum(sum(r.values())
                        for r in self.tax["taxonomy_by_set"].values())
        self.assertEqual(set_total, self.tax["failed_attempts"])


class TestHygiene(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dev = load_build("tasks_dev.json")
        cls.held = load_build("tasks_heldout.json")
        cls.hyg = hygiene_report(cls.dev, cls.held, BUILD)

    def test_exact_checks_all_zero(self):
        h = self.hyg
        for key in ("id_overlap_count",
                    "exact_fingerprint_overlap_count",
                    "exact_plan_overlap_count",
                    "dev_duplicate_ids", "dev_duplicate_fingerprints",
                    "heldout_duplicate_ids",
                    "heldout_duplicate_fingerprints",
                    "all_duplicate_full_texts",
                    "cross_set_duplicates_ignoring_id",
                    "agent_segment_banned_string_total",
                    "agent_segment_heldout_id_total",
                    "near_duplicate_pairs_at_or_above_0_9"):
            self.assertEqual(h[key], 0, key)
        self.assertTrue(h["all_exact_checks_zero"])

    def test_near_neighbour_disclosed(self):
        self.assertEqual(self.hyg["cross_set_pairs_compared"], 320)
        self.assertEqual(self.hyg["max_cross_set_jaccard"], 0.8)
        self.assertEqual(self.hyg["max_cross_set_pair"], ["D16", "H20"])
        self.assertEqual(
            self.hyg["near_neighbour_pairs_at_or_above_0_8"], 1)

    def test_behavioural_mutation_check(self):
        self.assertEqual(self.hyg["behavioural_mutation_tasks_checked"],
                         20)
        self.assertEqual(self.hyg["behavioural_mutation_runs_unchanged"],
                         20)

    def test_hashes_match_build_record(self):
        self.assertTrue(self.hyg["heldout_hash_matches_build_record"])
        self.assertTrue(self.hyg["dev_hash_matches_build_record"])

    def test_agent_segment_scoping(self):
        with open(os.path.join(BUILD, "eval_suite.py"),
                  encoding="utf-8") as f:
            src = f.read()
        segment = agent_class_segment(src)
        self.assertIn("class ConfigurableToyAgent", segment)
        self.assertNotIn("def validate_tasks", segment)
        # The module as a whole does name the scoring fields (the
        # scorer and validator use them); the agent segment does not.
        self.assertIn("expected_answer", src)
        self.assertNotIn("expected_answer", segment)


class TestResultsFile(unittest.TestCase):
    def test_results_deep_matches_fresh_report(self):
        with open(os.path.join(DEEP, "results_deep.json"),
                  encoding="utf-8") as f:
            saved = json.load(f)
        self.assertEqual(saved, full_report())


if __name__ == "__main__":
    unittest.main()
