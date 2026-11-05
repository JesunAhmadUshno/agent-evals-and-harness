"""Run the Learn evaluation and write deterministic results.

Run: python level-1-learn/run_learn.py
Writes level-1-learn/results_learn.json. No timestamps, no randomness,
no wall clock values, so two runs produce an identical file.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from agent_eval import evaluate  # noqa: E402


def load_tasks():
    path = os.path.join(HERE, "tasks_learn.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main():
    tasks = load_tasks()
    result = evaluate(tasks)
    for r in result["tasks"]:
        print(f"{r['task_id']} {r['category']}: outcome={r['agent_outcome']} "
              f"answer={r['agent_answer']} steps={r['steps']} "
              f"cost={r['cost_units']} matches={r['matches_expected']} "
              f"failure={r['failure_label']}")
    s = result["summary"]
    print(f"Summary: {s['succeeded']} succeeded, {s['failed']} failed of "
          f"{s['total_tasks']} tasks; success_rate={s['success_rate']} "
          f"matches={s['matches_expected']} total_steps={s['total_steps']} "
          f"mean_steps={s['mean_steps']} total_cost={s['total_cost_units']} "
          f"mean_cost={s['mean_cost_units']} "
          f"trajectory={s['trajectory_entries']}")
    out = {"scenario": "fixed 12-task set, deterministic toy agent (not an LLM)",
           "tasks": result["tasks"], "summary": s}
    path = os.path.join(HERE, "results_learn.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, sort_keys=True)
        f.write("\n")
    print("Wrote", path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
