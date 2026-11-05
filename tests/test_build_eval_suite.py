"""Unit tests for the Level 2 Build eval suite. Hand-computed checks."""
import hashlib
import json
import os
import random
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, "level-2-build")
sys.path.insert(0, BUILD)
from eval_suite import (  # noqa: E402
    VARIANTS, ConfigurableToyAgent, EvalError, mean_and_variance,
    pass_at_k, run_harness, run_suite, score_attempt, slip_rate,
    validate_tasks,
)


def load(name):
    with open(os.path.join(BUILD, name), encoding="utf-8") as f:
        return json.load(f)


def simple_task(tid="T1", **over):
    task = {"id": tid, "category": "arithmetic", "difficulty": 1,
            "expected_outcome": "success", "expected_answer": 3,
            "expected_failure_label": None,
            "plan": [{"tool": "add", "args": [1, 2]}]}
    task.update(over)
    return task


class TestPassAtK(unittest.TestCase):
    def test_pass_at_1_hand_computed(self):
        # First attempts: True, False, True, False gives 2 of 4.
        m = [[True, False], [False, True], [True, True], [False, False]]
        self.assertEqual(pass_at_k(m, 1), 0.5)

    def test_pass_at_2_hand_computed(self):
        # Any of first 2: rows 1, 2, 3 pass, row 4 fails, gives 0.75.
        m = [[True, False], [False, True], [True, True], [False, False]]
        self.assertEqual(pass_at_k(m, 2), 0.75)

    def test_pass_at_k_monotonic(self):
        m = [[False, False, True], [False, True, False], [False, False, False]]
        self.assertLessEqual(pass_at_k(m, 1), pass_at_k(m, 2))
        self.assertLessEqual(pass_at_k(m, 2), pass_at_k(m, 3))
        self.assertEqual(pass_at_k(m, 3), round(2 / 3, 4))

    def test_pass_at_k_empty_rejected(self):
        with self.assertRaises(EvalError):
            pass_at_k([], 1)


class TestVariance(unittest.TestCase):
    def test_mean_and_variance_hand_computed(self):
        # Values 0.8, 0.9, 1.0: mean 0.9, population variance
        # ((0.01 + 0 + 0.01) / 3) = 0.0067 rounded, std 0.0816.
        stats = mean_and_variance([0.8, 0.9, 1.0])
        self.assertEqual(stats["mean"], 0.9)
        self.assertEqual(stats["variance"], 0.0067)
        self.assertEqual(stats["std"], 0.0816)

    def test_variance_zero_for_constant(self):
        stats = mean_and_variance([0.5, 0.5, 0.5])
        self.assertEqual(stats["variance"], 0.0)
        self.assertEqual(stats["std"], 0.0)


class TestAblations(unittest.TestCase):
    def setUp(self):
        self.multi = simple_task(
            "M", category="multi-step", expected_answer=35,
            plan=[{"tool": "add", "args": [3, 4]},
                  {"tool": "multiply", "args": ["@prev", 5]}])

    def run_variant(self, name, task, seed="t"):
        agent = ConfigurableToyAgent(VARIANTS[name])
        return agent.run(task, random.Random(seed))

    def test_planner_off_truncates(self):
        run = self.run_variant("no_planner", self.multi)
        self.assertEqual(run["steps"], 1)
        self.assertEqual(run["answer"], 7)

    def test_planner_on_completes(self):
        run = self.run_variant("full", self.multi)
        self.assertIn(run["answer"], (35, 36))
        self.assertGreaterEqual(run["steps"], 2)

    def test_memory_recall_fails_without_memory(self):
        task = simple_task(
            "R", category="memory", expected_answer=30,
            plan=[{"tool": "lookup", "args": ["score_alice"]},
                  {"tool": "add", "args": [1, 2]},
                  {"tool": "multiply", "args": ["@recall:score_alice", 3]}])
        off = self.run_variant("no_memory", task)
        self.assertEqual(off["outcome"], "failure")
        self.assertEqual(off["failure_label"], "memory_unavailable")
        on = self.run_variant("full", task)
        self.assertEqual(on["outcome"], "success")

    def test_memory_cache_reduces_cost(self):
        task = simple_task(
            "C", category="memory", expected_answer=6,
            plan=[{"tool": "lookup", "args": ["unit_price_apple"]},
                  {"tool": "lookup", "args": ["unit_price_apple"]},
                  {"tool": "add", "args": ["@step0", "@step1"]}])
        with_mem = self.run_variant("full", task)
        without = self.run_variant("no_memory", task)
        self.assertLess(with_mem["cost_units"], without["cost_units"])

    def test_verifier_catches_some_slips(self):
        # Over many seeded attempts on a difficulty 3 task, the
        # no_verifier variant passes strictly less often than full.
        tasks = [simple_task("V%02d" % i, difficulty=3, expected_answer=3)
                 for i in range(20)]
        full = run_suite(tasks, "full", 99)
        no_ver = run_suite(tasks, "no_verifier", 99)
        self.assertGreater(full["attempt_success_rate"],
                           no_ver["attempt_success_rate"])

    def test_minimal_differs_from_full(self):
        dev = load("tasks_dev.json")
        full = run_suite(dev, "full", 11)
        minimal = run_suite(dev, "minimal", 11)
        self.assertGreater(full["attempt_success_rate"],
                           minimal["attempt_success_rate"])


class TestTaskSets(unittest.TestCase):
    def test_dev_and_heldout_counts(self):
        dev = load("tasks_dev.json")
        held = load("tasks_heldout.json")
        self.assertGreaterEqual(len(dev), 12)
        self.assertGreaterEqual(len(held), 16)
        self.assertEqual(len(dev), 16)
        self.assertEqual(len(held), 20)

    def test_no_id_overlap_between_sets(self):
        dev_ids = {t["id"] for t in load("tasks_dev.json")}
        held_ids = {t["id"] for t in load("tasks_heldout.json")}
        self.assertFalse(dev_ids & held_ids)

    def test_both_sets_validate(self):
        validate_tasks(load("tasks_dev.json"))
        validate_tasks(load("tasks_heldout.json"))

    def test_heldout_hash_matches_file(self):
        path = os.path.join(BUILD, "tasks_heldout.json")
        with open(path, "rb") as f:
            digest = hashlib.sha256(f.read()).hexdigest()
        results = load("results_build.json")
        self.assertEqual(results["heldout_file_sha256"], digest)

    def test_agent_source_has_no_task_file_reference(self):
        with open(os.path.join(BUILD, "eval_suite.py"),
                  encoding="utf-8") as f:
            src = f.read()
        self.assertNotIn("tasks_heldout", src)
        self.assertNotIn("tasks_dev", src)

    def test_agent_ignores_expected_answer(self):
        # Mutating the scoring key must not change the agent run:
        # the agent never reads expected fields.
        task = simple_task("L", expected_answer=3)
        agent = ConfigurableToyAgent(VARIANTS["full"])
        before = agent.run(task, random.Random("same"))
        task2 = dict(task, expected_answer=999999)
        after = agent.run(task2, random.Random("same"))
        self.assertEqual(before["answer"], after["answer"])
        self.assertEqual(before["steps"], after["steps"])

    def test_split_counts_in_results(self):
        results = load("results_build.json")
        self.assertEqual(results["dev_tasks"], 16)
        self.assertEqual(results["heldout_tasks"], 20)
        for name in VARIANTS:
            self.assertEqual(results["variants"][name]["dev"]["tasks"], 16)
            self.assertEqual(
                results["variants"][name]["heldout"]["tasks"], 20)


class TestDeterminismAndScoring(unittest.TestCase):
    def test_same_seeds_identical_suite(self):
        dev = load("tasks_dev.json")
        a = run_suite(dev, "full", 42)
        b = run_suite(dev, "full", 42)
        self.assertEqual(a, b)

    def test_harness_deterministic(self):
        dev = load("tasks_dev.json")[:4]
        held = load("tasks_heldout.json")[:4]
        self.assertEqual(run_harness(dev, held), run_harness(dev, held))

    def test_score_attempt_success_and_failure_tasks(self):
        ok = {"outcome": "success", "answer": 3, "failure_label": None}
        bad = {"outcome": "success", "answer": 4, "failure_label": None}
        self.assertTrue(score_attempt(simple_task(), ok))
        self.assertFalse(score_attempt(simple_task(), bad))
        ftask = simple_task("F", expected_outcome="failure",
                            expected_answer=None,
                            expected_failure_label="division_by_zero")
        frun = {"outcome": "failure", "answer": None,
                "failure_label": "division_by_zero"}
        self.assertTrue(score_attempt(ftask, frun))

    def test_slip_rate_by_difficulty(self):
        self.assertEqual(slip_rate(simple_task(difficulty=1)), 0.08)
        self.assertEqual(slip_rate(simple_task(difficulty=3)), 0.24)

    def test_ablation_table_shape_and_ordering(self):
        results = load("results_build.json")
        table = results["ablation_table"]
        self.assertEqual([r["variant"] for r in table],
                         ["full", "no_planner", "no_memory",
                          "no_verifier", "minimal"])
        for row in table:
            self.assertLessEqual(row["pass_at_1"], row["pass_at_3"])
            self.assertLessEqual(row["pass_at_3"], row["pass_at_5"])
        by_name = {r["variant"]: r for r in table}
        self.assertGreater(by_name["full"]["mean_success"],
                           by_name["minimal"]["mean_success"])


if __name__ == "__main__":
    unittest.main()
