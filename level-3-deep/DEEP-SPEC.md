# DEEP-SPEC: Level 3, Deep (compressed), agent-evals-and-harness (P27)

Status: written before the Deep build, 2026-11-05. This is the
compressed Deep scope for the December compression protocol: the
single hardest capability in SPEC.md, built, tested, and measured.
The rest of the v2 Deep scope is named as the v1.1 backlog in the
repo-root ROADMAP.md.

## Compressed Deep scope (from SPEC.md)

SPEC.md Deep text: a failure taxonomy (tool misuse, loop traps,
silent wrong answers) with counts from real runs, and a
contamination hygiene report.

Compressed Deep therefore delivers exactly two measured products:

1. A failure taxonomy with counts from real runs. Real runs means
   the Level 2 Build eval suite is imported and executed again
   here, across all five toy agent variants, all five master
   seeds, both task sets (16 dev plus 20 held-out), and 5 attempts
   per task: 5 variants times 5 seeds times 36 tasks times 5
   attempts = 4,500 attempts. No Build number is copied by hand.
   Every failed attempt gets exactly one primary class, so the
   class counts sum to the failure total, and the arithmetic is
   shown in the output and in the README.
2. A contamination hygiene report, computed in code, covering:
   exact overlap between the dev and held-out task sets, near
   overlap between the sets, task text duplication inside and
   across the sets, a check that the toy agent code contains no
   held-out answers or scoring fields, a behavioural check that
   mutating the scoring keys does not change a toy agent run, and
   a held-out file hash check against the Build record.

## Honest scope line

The agent under test is a toy agent. It is not an LLM, it is not
a real agent, it calls no API, and it does not learn. Every label
in this level says toy agent where a reader could mistake it for
a real model. The taxonomy describes this toy agent only. No
claim is made about real agents, real models, or any external
benchmark.

## Taxonomy classes and operational rules

A failed attempt is an attempt where the Build scorer
(score_attempt) returns False. Classes are assigned by the first
matching rule below, in this precedence order. Rules use only
the run record (outcome, failure label, slip flags, step count),
the trajectory log, the task plan length, and the variant
configuration. They never use the expected answer directly,
except through the scorer pass or fail bit.

1. loop_trap: a non-verifier (tool, resolved args) pair occurs
   at least 3 times in one trajectory. Planned duplicate calls
   in this task set occur at most twice (tasks D11 and H13), so
   3 or more repeats cannot be a planned step.
2. excess_steps: the run step count is greater than the plan
   length plus 1. One extra step is allowed for the verifier,
   which is the only source of a step beyond the plan.
3. truncated_plan: the variant has the planner component off
   and the task plan has more than 1 step. The Build code
   truncates such a plan to its first step, so the toy agent
   answers from an intermediate result, or never reaches the
   step that would have produced the expected failure.
4. tool_misuse: the run ends in outcome failure with a non-null
   failure label, and no rule above matched. The toy agent (or
   a component it depends on) used a tool or a recall in a way
   that ended the run in a tool error instead of an answer.
   In this data the label is memory_unavailable (a recall step
   used with the memory component off, in a variant where the
   planner is on, so rule 3 did not fire first).
5. silent_wrong_answer: the run ends in outcome success, the
   slip flag is true, and the slip_caught flag is false. The
   toy agent returned a corrupted answer with no error signal.
6. other_wrong_answer: any remaining failed attempt. This is a
   fallback so the counts always sum; its count is reported
   even when it is zero.

Zero counts are reported as zero. A class that this toy agent
structurally cannot reach often is a finding, not a gap to hide:
the toy agent has no retry loop, and its step count is bounded
by the plan length plus the verifier step, so loop_trap and
excess_steps are expected to be rare or zero, and that limit is
named in the grade deductions.

## Hygiene checks and thresholds

- id overlap: intersection of dev and held-out task ids.
- exact fingerprint overlap: cross-set pairs whose canonical
  fingerprint (category, plan, expected outcome, expected
  answer, expected failure label) is identical. Pass is 0.
- exact plan overlap: cross-set pairs with identical plan JSON.
  Pass is 0.
- near overlap: Jaccard similarity over fingerprint tokens
  (category, outcome, answer, failure label, and each plan tool
  and arg) for all 320 cross-set pairs. Near duplicate is
  defined as similarity at or above 0.9. Pairs at or above 0.8
  are also counted and the maximum pair is named, as near
  neighbours worth disclosing even when they are not duplicates.
- duplication: duplicate ids, duplicate fingerprints, and
  duplicate full task texts inside each set, duplicate full
  texts across both sets (36 texts), and cross-set duplicates
  when the id field is ignored. Pass is 0 for each.
- agent code check: the source segment of the
  ConfigurableToyAgent class in level-2-build/eval_suite.py is
  scanned for the strings expected_answer,
  expected_failure_label, tasks_dev, and tasks_heldout, and for
  every held-out task id. Pass is 0 occurrences of each.
- behavioural check: for every held-out task, a full-variant
  toy agent run with the original scoring keys is compared with
  a run where expected_answer and expected_failure_label are
  replaced by a sentinel, under the same attempt seed. The runs
  must be identical for all 20 tasks.
- hash check: the sha256 of tasks_heldout.json and of
  tasks_dev.json must equal the hashes recorded in
  level-2-build/results_build.json.
- informational: distinct expected_answer values shared between
  the sets are counted and reported, not treated as
  contamination, because answers here are small integers and
  world facts that repeat by design.

## Acceptance criteria

- level-3-deep/deep_analysis.py imports the Build code, uses
  only the Python standard library, and computes every number
  in results_deep.json in code.
- level-3-deep/run_deep.py writes results_deep.json
  deterministically: run twice, identical file.
- Taxonomy counts sum to the failure total; the sum check is a
  field in results_deep.json and a unit test.
- New tests in tests/test_deep_*.py pass, and the full test
  suite passes.
- level-3-deep/README.md carries the measured taxonomy table,
  the hygiene table, a failure modes section, and itemized
  grade deductions that sum to the grade.
- Root README.md and DOSSIER.md are updated to ship state, and
  repo-root ROADMAP.md names the rest of the v2 Deep scope as
  the v1.1 backlog.
