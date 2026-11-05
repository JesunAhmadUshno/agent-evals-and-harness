# ROADMAP: agent-evals-and-harness (P27)

## v1.0 (shipped 2026-11-05)

- Level 1, Learn: DONE. One deterministic toy agent (not an LLM)
  scored on a fixed 12-task set, with trajectory logs.
  Grade 8,700 of 10,000.
- Level 2, Build: DONE. Eval suite with a 16-task dev set and a
  20-task held-out set, pass@k and variance over 5 master seeds,
  and five toy component ablation variants. Grade 8,200 of
  10,000.
- Level 3, Deep (compressed): DONE. Failure taxonomy with counts
  from real runs of the Build suite (4,500 attempts, 1,285
  failures, six primary classes, counts sum to the failure
  total), plus a contamination hygiene report computed in code.
  Grade 7,750 of 10,000. See level-3-deep/README.md.

Compressed Deep note: under the December compression protocol,
Deep delivered the single hardest capability in SPEC.md (the
failure taxonomy with real-run counts, plus the hygiene report).
The rest of the v2 Deep scope is the v1.1 backlog below. Nothing
in the backlog is claimed as done.

## v1.1 backlog (named remainder of the v2 Deep scope)

- A real agent under test: evaluate an actual LLM-backed agent
  through an API or a local model, so the taxonomy classes
  describe real agent behaviour, not a toy agent.
- Loop-capable agent runs: an agent that can retry and replan,
  so loop_trap and excess_steps are reachable classes with a
  measurable count, plus step and cost budgets enforced by the
  harness.
- Richer tool misuse coverage: wrong tool selection, wrong
  argument values, and untrusted tool output cases, each as its
  own labelled task family.
- External held-out tasks: a task set authored outside this
  repo (third-party or newly written by another author), so the
  hygiene report checks independence, not only exact leakage.
- Contamination checks against an external corpus: n-gram and
  near-duplicate overlap of task texts against a named public
  benchmark corpus, with the corpus version recorded.
- Human adjudication sample: a hand-labelled sample of failed
  attempts, checked against the classifier output, with an
  agreement rate reported.
- Real cost accounting: token and money cost per attempt for a
  real model, replacing the fixed unit price list.
- Larger task base: grow dev and held-out sets so taxonomy
  shares rest on more distinct tasks, not seeded reruns.
- Fleet rerun: repeat the Deep sweep on the assigned fleet node
  BlackBoxV2 and record any difference.
