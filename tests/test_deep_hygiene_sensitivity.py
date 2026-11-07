"""Tests for the hygiene threshold sweep (level-3-deep/hygiene_sensitivity.py)."""
import json
import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, "level-2-build")
DEEP = os.path.join(ROOT, "level-3-deep")
sys.path.insert(0, DEEP)

from hygiene_sensitivity import sensitivity  # noqa: E402


def load(folder, name):
    with open(os.path.join(folder, name), encoding="utf-8") as f:
        return json.load(f)


class HygieneSensitivityTests(unittest.TestCase):
    def setUp(self):
        self.result = sensitivity(load(BUILD, "tasks_dev.json"), load(BUILD, "tasks_heldout.json"))
        self.deep = load(DEEP, "results_deep.json")["hygiene"]

    def test_agrees_with_the_recorded_hygiene_report(self):
        counts = self.result["pairs_at_or_above"]
        self.assertEqual(self.result["pairs_compared"], self.deep["cross_set_pairs_compared"])
        self.assertEqual(counts["0.90"], self.deep["near_duplicate_pairs_at_or_above_0_9"])
        self.assertEqual(counts["0.80"], self.deep["near_neighbour_pairs_at_or_above_0_8"])
        top = self.result["top_pairs"][0]
        self.assertEqual(top[0], self.deep["max_cross_set_jaccard"])
        self.assertEqual(top[1:], self.deep["max_cross_set_pair"])

    def test_counts_never_increase_with_the_threshold(self):
        counts = [self.result["pairs_at_or_above"]["%.2f" % t] for t in self.result["thresholds"]]
        self.assertEqual(counts, sorted(counts, reverse=True))

    def test_saved_file_matches_a_fresh_run(self):
        self.assertEqual(load(DEEP, "results_hygiene_sensitivity.json"), self.result)


if __name__ == "__main__":
    unittest.main()
