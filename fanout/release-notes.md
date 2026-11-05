# Release notes: agent-evals-and-harness (P27)

One section per release line. Every number below comes from the
level README of that release and the release text on GitHub,
verified with gh release list on 2026-11-05. The agent in every
release is a toy deterministic agent, NOT an LLM. Held-out, where
it appears, means unseen during development in this repo, NOT an
external benchmark. The full release text and artifacts live on
the GitHub releases page:
https://github.com/JesunAhmadUshno/agent-evals-and-harness/releases

## v0.1, Learn (2026-11-05)

- What shipped: an evaluator that scores one deterministic toy
  agent (not an LLM) on a fixed 12-task set, with success rate,
  steps, cost per task, and full trajectory logs, plus 21 unit
  tests and the scaffold smoke test.
- Measured result: 9 succeeded and 3 failed by design of 12
  tasks, success rate 0.75, 12 of 12 outcomes matched the
  expected answer or failure label, 18 total steps at mean 1.5,
  27 total cost units at mean 2.25, and 18 trajectory entries.
- Level grade: 8,700 of 10,000.
- Release: https://github.com/JesunAhmadUshno/agent-evals-and-harness/releases/tag/v0.1

## v0.5, Build (2026-11-05)

- What shipped: an eval suite with a 16-task dev set and a
  20-task held-out set reported separately (held-out meaning
  unseen during development in this repo, not an external
  benchmark), pass at k and variance over 5 master seeds, and a
  harness over five toy component ablation variants (planner,
  memory, verifier; component ablations, not model ablations),
  plus 24 new tests (45 unit tests in total with Learn).
- Measured result, combined 36 tasks: full variant pass@1
  0.9889, pass@3 1.000, pass@5 1.000, mean attempt success 0.980;
  no_planner mean 0.4411, no_memory mean 0.8744, no_verifier
  mean 0.8678, minimal mean 0.4089. Full variant split: dev mean
  0.9775, held-out mean 0.982.
- Level grade: 8,200 of 10,000.
- Release: https://github.com/JesunAhmadUshno/agent-evals-and-harness/releases/tag/v0.5

## v1.0, Learn, Build, and compressed Deep (2026-11-05)

- What shipped: a failure taxonomy with counts from real runs of
  the Build suite and a contamination hygiene report computed in
  code, on top of the Learn and Build levels above, plus 19 new
  tests (64 unit tests in total, plus the scaffold smoke test).
  The rest of the v2 Deep scope is named in ROADMAP.md as the
  v1.1 backlog.
- Measured result: 4,500 attempts, 3,215 passed, 1,285 failed,
  classified as truncated_plan 1,000 (77.82 percent of failures),
  silent_wrong_answer 185, tool_misuse 100, loop_trap 0,
  excess_steps 0, other_wrong_answer 0, with the counts summing
  to the failure total. Hygiene: 320 cross-set pairs compared,
  0 exact overlaps, 0 duplicates, 0 held-out answers in the toy
  agent code, behavioural mutation check 20 of 20, and one near
  neighbour pair (D16 and H20, Jaccard 0.8) disclosed.
- Level grade: 7,750 of 10,000 (compressed Deep).
- Release: https://github.com/JesunAhmadUshno/agent-evals-and-harness/releases/tag/v1.0

## Held channels

- Social posts for every release above: HELD under the standing
  platform rules. The loop prepares drafts and never posts;
  Threads needs Jesun's one tap per post.
- The v1.1 backlog lives in ROADMAP.md: a real LLM-backed agent,
  a loop-capable agent, richer tool misuse families, external
  held-out tasks, external-corpus hygiene checks, a human
  adjudication sample, real cost accounting, a larger task base,
  and a fleet rerun on BlackBoxV2.
