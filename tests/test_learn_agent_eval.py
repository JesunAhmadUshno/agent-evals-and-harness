"""Unit tests for the Level 1 Learn agent evaluator. Hand-computed checks."""
import json
import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "level-1-learn"))
from agent_eval import (  # noqa: E402
    EvalError, TOOL_COSTS, ToyAgent, evaluate, tool_add, tool_divide,
    tool_lookup, tool_multiply, ToolFailure, validate_tasks,
)


def load_tasks():
    path = os.path.join(ROOT, "level-1-learn", "tasks_learn.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def make_task(tid, **over):
    task = {"id": tid, "category": "arithmetic", "expected_outcome": "success",
            "expected_answer": 3, "expected_failure_label": None,
            "plan": [{"tool": "add", "args": [1, 2]}]}
    task.update(over)
    return task


class TestTools(unittest.TestCase):
    def test_tool_costs(self):
        self.assertEqual(TOOL_COSTS,
                         {"add": 2, "multiply": 2, "divide": 2, "lookup": 1})

    def test_add_and_multiply(self):
        self.assertEqual(tool_add(17, 25), 42)
        self.assertEqual(tool_multiply(6, 7), 42)

    def test_divide_and_zero(self):
        self.assertEqual(tool_divide(10, 2), 5.0)
        with self.assertRaises(ToolFailure) as cm:
            tool_divide(10, 0)
        self.assertEqual(cm.exception.label, "division_by_zero")

    def test_lookup_hit_and_miss(self):
        self.assertEqual(tool_lookup("capital_canada"), "Ottawa")
        with self.assertRaises(ToolFailure) as cm:
            tool_lookup("capital_atlantis")
        self.assertEqual(cm.exception.label, "missing_knowledge")


class TestValidation(unittest.TestCase):
    def test_duplicate_id_rejected(self):
        with self.assertRaises(EvalError):
            validate_tasks([make_task("A"), make_task("A")])

    def test_unknown_category_rejected(self):
        with self.assertRaises(EvalError):
            validate_tasks([make_task("A", category="cooking")])

    def test_unknown_tool_rejected(self):
        with self.assertRaises(EvalError):
            validate_tasks([make_task("A", plan=[{"tool": "fly", "args": []}])])

    def test_failure_task_needs_label(self):
        bad = make_task("A", expected_outcome="failure",
                        expected_answer=None, expected_failure_label=None)
        with self.assertRaises(EvalError):
            validate_tasks([bad])


class TestEvaluate(unittest.TestCase):
    def setUp(self):
        self.result = evaluate(load_tasks())
        self.by_id = {r["task_id"]: r for r in self.result["tasks"]}
        self.s = self.result["summary"]

    def test_summary_counts(self):
        self.assertEqual(self.s["total_tasks"], 12)
        self.assertEqual(self.s["succeeded"], 9)
        self.assertEqual(self.s["failed"], 3)
        self.assertEqual(self.s["matches_expected"], 12)

    def test_success_and_match_rates(self):
        # 9 of 12 tasks succeed: 9/12 = 0.75. All 12 match their
        # expected outcome label: 12/12 = 1.0.
        self.assertEqual(self.s["success_rate"], 0.75)
        self.assertEqual(self.s["match_rate"], 1.0)

    def test_total_steps_hand_computed(self):
        # arithmetic 1+1+2=4, lookup 1+1+1=3, multi-step 2+3+2=7,
        # designed-failure 1+1+2=4. Total 4+3+7+4 = 18.
        self.assertEqual(self.s["total_steps"], 18)

    def test_mean_steps_hand_computed(self):
        # 18 steps over 12 tasks: 18/12 = 1.5.
        self.assertEqual(self.s["mean_steps"], 1.5)

    def test_total_cost_hand_computed(self):
        # arithmetic 2+2+(2+2)=8, lookup 1+1+1=3,
        # multi-step (1+2)+(1+1+2)+(1+2)=10,
        # designed-failure 1+2+(1+2)=6. Total 8+3+10+6 = 27.
        self.assertEqual(self.s["total_cost_units"], 27)

    def test_mean_cost_hand_computed(self):
        # 27 cost units over 12 tasks: 27/12 = 2.25.
        self.assertEqual(self.s["mean_cost_units"], 2.25)

    def test_per_category_hand_computed(self):
        pc = self.s["per_category"]
        # arithmetic: 3 tasks, steps (1+1+2)/3 = 1.3333, cost (2+2+4)/3 = 2.6667
        self.assertEqual(pc["arithmetic"]["success_rate"], 1.0)
        self.assertEqual(pc["arithmetic"]["mean_steps"], 1.3333)
        self.assertEqual(pc["arithmetic"]["mean_cost_units"], 2.6667)
        self.assertEqual(pc["lookup"]["total_cost_units"], 3)
        self.assertEqual(pc["multi-step"]["total_steps"], 7)
        self.assertEqual(pc["multi-step"]["mean_cost_units"], 3.3333)
        self.assertEqual(pc["designed-failure"]["succeeded"], 0)
        self.assertEqual(pc["designed-failure"]["success_rate"], 0.0)

    def test_designed_failures_named(self):
        self.assertEqual(self.by_id["F01"]["failure_label"], "missing_knowledge")
        self.assertEqual(self.by_id["F01"]["agent_outcome"], "failure")
        self.assertEqual(self.by_id["F02"]["failure_label"], "division_by_zero")
        self.assertEqual(self.by_id["F03"]["failure_label"], "division_by_zero")
        self.assertTrue(self.by_id["F01"]["matches_expected"])

    def test_trajectory_order_and_content(self):
        # M02 trajectory: lookup alice, lookup bob, add of the two.
        traj = self.by_id["M02"]["trajectory"]
        self.assertEqual([t["tool"] for t in traj], ["lookup", "lookup", "add"])
        self.assertEqual([t["result"] for t in traj], [10, 15, 25])
        self.assertEqual(traj[2]["args"], [10, 15])
        self.assertEqual(self.s["trajectory_entries"], 18)

    def test_trajectory_failure_entry(self):
        traj = self.by_id["F03"]["trajectory"]
        self.assertEqual(len(traj), 2)
        self.assertEqual(traj[0]["result"], 0)
        self.assertIsNone(traj[1]["result"])
        self.assertEqual(traj[1]["failure_label"], "division_by_zero")

    def test_answers_exact(self):
        self.assertEqual(self.by_id["A03"]["agent_answer"], 35)
        self.assertEqual(self.by_id["L01"]["agent_answer"], "Ottawa")
        self.assertEqual(self.by_id["M01"]["agent_answer"], 12)
        self.assertIsNone(self.by_id["F01"]["agent_answer"])

    def test_agent_direct_multistep(self):
        task = {"id": "X", "category": "multi-step",
                "plan": [{"tool": "add", "args": [3, 4]},
                         {"tool": "multiply", "args": ["@prev", 5]}]}
        run = ToyAgent().run(task)
        self.assertEqual(run["answer"], 35)
        self.assertEqual(run["steps"], 2)
        self.assertEqual(run["cost_units"], 4)

    def test_determinism(self):
        again = evaluate(load_tasks())
        self.assertEqual(again, self.result)


if __name__ == "__main__":
    unittest.main()
