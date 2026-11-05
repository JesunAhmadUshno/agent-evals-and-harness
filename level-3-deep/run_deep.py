"""Run the Deep analysis and write deterministic results.

Run: python level-3-deep/run_deep.py
Writes level-3-deep/results_deep.json. No timestamps, no wall
clock values; all randomness is seeded inside the Build suite,
so two runs produce an identical file.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from deep_analysis import full_report  # noqa: E402


def main():
    report = full_report()
    tax = report["taxonomy"]
    print("attempts=%d passed=%d failed=%d" % (
        tax["total_attempts"], tax["passed_attempts"],
        tax["failed_attempts"]))
    for name, count in tax["taxonomy_counts"].items():
        print("%s=%d" % (name, count))
    print("taxonomy sum=%d matches failures=%s" % (
        tax["taxonomy_sum"], tax["taxonomy_sum_matches_failures"]))
    hyg = report["hygiene"]
    print("hygiene exact checks zero=%s max jaccard=%s pair=%s" % (
        hyg["all_exact_checks_zero"], hyg["max_cross_set_jaccard"],
        hyg["max_cross_set_pair"]))
    path = os.path.join(HERE, "results_deep.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, sort_keys=True)
        f.write("\n")
    print("Wrote", path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
