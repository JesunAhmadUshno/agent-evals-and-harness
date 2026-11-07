"""Threshold sensitivity for the hygiene near-duplicate check.

The Deep hygiene report flags cross-set pairs at a fixed Jaccard
threshold of 0.9 (near duplicate) and 0.8 (near neighbour) on
hand-built fingerprint tokens. This script shows how the flagged
count moves across thresholds, so the choice of 0.9 is visible
instead of implicit. It reuses deep_analysis._fingerprint_tokens
and _jaccard unchanged.

Run: python level-3-deep/hygiene_sensitivity.py
Writes level-3-deep/results_hygiene_sensitivity.json, with no
timestamps; two runs produce an identical file.

Only the Python standard library is used.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(os.path.dirname(HERE), "level-2-build")
sys.path.insert(0, HERE)
from deep_analysis import _fingerprint_tokens, _jaccard  # noqa: E402

THRESHOLDS = [round(0.3 + 0.05 * i, 2) for i in range(15)]


def pair_similarities(dev_tasks, heldout_tasks):
    """Jaccard similarity for every dev x held-out pair, highest first."""
    pairs = []
    for d in dev_tasks:
        d_tok = _fingerprint_tokens(d)
        for h in heldout_tasks:
            pairs.append([round(_jaccard(d_tok, _fingerprint_tokens(h)), 4), d["id"], h["id"]])
    pairs.sort(key=lambda p: (-p[0], p[1], p[2]))
    return pairs


def sensitivity(dev_tasks, heldout_tasks):
    pairs = pair_similarities(dev_tasks, heldout_tasks)
    sims = [p[0] for p in pairs]
    return {
        "scenario": "hygiene near-duplicate threshold sweep over every dev x held-out pair, "
                    "same fingerprint tokens and Jaccard as deep_analysis.py",
        "pairs_compared": len(pairs),
        "thresholds": THRESHOLDS,
        "pairs_at_or_above": {"%.2f" % t: sum(1 for s in sims if s >= t) for t in THRESHOLDS},
        "top_pairs": pairs[:10],
    }


def main():
    def load(name):
        with open(os.path.join(BUILD, name), encoding="utf-8") as f:
            return json.load(f)

    out = sensitivity(load("tasks_dev.json"), load("tasks_heldout.json"))
    for t, n in out["pairs_at_or_above"].items():
        print("jaccard >= %s: %d pairs" % (t, n))
    path = os.path.join(HERE, "results_hygiene_sensitivity.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, sort_keys=True)
        f.write("\n")
    print("Wrote", path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
