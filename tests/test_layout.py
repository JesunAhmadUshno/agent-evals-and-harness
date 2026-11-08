"""Portfolio standard checks: required files exist and no public file carries a grade."""
import os
import re
import subprocess
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REQUIRED = [
    "README.md", "PROPOSAL.md", "REPORT.md", "CHANGELOG.md", "CITATION.cff", "SECURITY.md", "LICENSE",
    "docs/decisions/0001-keep-level-folders.md",
    "level-1-learn/run_learn.py", "level-1-learn/tasks_learn.json", "level-1-learn/results_learn.json",
    "level-2-build/run_build.py", "level-2-build/tasks_dev.json", "level-2-build/tasks_heldout.json",
    "level-2-build/results_build.json", "level-3-deep/run_deep.py", "level-3-deep/results_deep.json",
    "level-3-deep/hygiene_sensitivity.py", "level-3-deep/results_hygiene_sensitivity.json",
]
# Grades are internal. These patterns catch the old public forms: "8,700 of 10,000", "Grade: ...",
# "x/10000", and rubric score columns such as "Total /1000".
GRADE = re.compile(r"of 10,000|/ ?10,?000\b|\bGrade:|/1000\b|\b\d[\d,]* points\b", re.IGNORECASE)
LIFECYCLE = ["Question", "Proposal", "Baseline", "Build", "Evaluate", "Report", "Review", "Release"]


def public_text_files():
    out = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    for path in out.split():
        if path.endswith((".md", ".js", ".jsx", ".mjs", ".html", ".cff", ".yml")) and "package-lock" not in path:
            yield path


class LayoutTest(unittest.TestCase):
    def test_required_files_exist(self):
        missing = [p for p in REQUIRED if not os.path.exists(os.path.join(ROOT, p))]
        self.assertEqual(missing, [], "missing: " + ", ".join(missing))

    def test_no_public_grade(self):
        hits = []
        for path in public_text_files():
            with open(os.path.join(ROOT, path), encoding="utf-8") as f:
                for n, line in enumerate(f, 1):
                    if GRADE.search(line):
                        hits.append(f"{path}:{n}: {line.strip()}")
        self.assertEqual(hits, [], "grades are internal:\n" + "\n".join(hits))

    def test_grade_pattern_catches_the_old_forms(self):
        for bad in ("Grade: 8,700 of 10,000", "7,750/10000", "| Total /1000 |", "worth 300 points"):
            self.assertTrue(GRADE.search(bad), bad)
        self.assertFalse(GRADE.search("pass@1 0.9889 over 4,500 attempts"))

    def test_readme_abstract_and_lifecycle(self):
        with open(os.path.join(ROOT, "README.md"), encoding="utf-8") as f:
            text = f.read()
        for label in ("**Question.**", "**Headline.**", "**Field.**", "**Job family.**", "**Verdict.**"):
            self.assertIn(label, text)
        stages = re.findall(r"^- (\w+): (?:DONE|OPEN)", text, re.M)
        self.assertEqual(stages, LIFECYCLE)
        self.assertIn("not pre-registered", text, "no plan was locked before the runs; the label must stay")


if __name__ == "__main__":
    unittest.main()
