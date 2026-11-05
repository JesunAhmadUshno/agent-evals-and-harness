"""Run the Build harness and write deterministic results.

Run: python level-2-build/run_build.py
Writes level-2-build/results_build.json. No timestamps, no wall
clock values; all randomness is seeded inside eval_suite, so two
runs produce an identical file.
"""
import hashlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from eval_suite import MASTER_SEEDS, run_harness  # noqa: E402


def load(name):
    path = os.path.join(HERE, name)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def file_hash(name):
    path = os.path.join(HERE, name)
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def main():
    dev = load("tasks_dev.json")
    heldout = load("tasks_heldout.json")
    result = run_harness(dev, heldout)
    for row in result["ablation_table"]:
        print("%s pass@1=%s pass@3=%s pass@5=%s mean=%s var=%s "
              "steps=%s cost=%s" % (
                  row["variant"], row["pass_at_1"], row["pass_at_3"],
                  row["pass_at_5"], row["mean_success"], row["variance"],
                  row["mean_steps"], row["mean_cost_units"]))
    out = {
        "scenario": "configurable toy agent (not an LLM), component "
                    "ablations (not model ablations), dev set plus "
                    "held-out set reported separately",
        "master_seeds": MASTER_SEEDS,
        "attempts_per_task": 5,
        "pass_k_definition": "a task passes at k if any of its first "
                             "k attempts passes; pass@k is the mean "
                             "over master seeds of the per-seed "
                             "fraction of tasks passing at k",
        "mean_success_definition": "mean over master seeds of the "
                                   "per-seed attempt success rate "
                                   "(passed attempts over all attempts)",
        "variance_definition": "population variance over master seeds "
                               "of the per-seed attempt success rate",
        "dev_tasks": len(dev),
        "heldout_tasks": len(heldout),
        "heldout_file_sha256": file_hash("tasks_heldout.json"),
        "dev_file_sha256": file_hash("tasks_dev.json"),
        "ablation_table": result["ablation_table"],
        "variants": result["variants"],
    }
    path = os.path.join(HERE, "results_build.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, sort_keys=True)
        f.write("\n")
    print("Wrote", path)
    print("heldout sha256", out["heldout_file_sha256"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
