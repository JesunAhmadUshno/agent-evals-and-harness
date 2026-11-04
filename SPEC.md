# SPEC: agent-evals-and-harness (P27)

Phase skill: spec-driven-development (house engineering pipeline).
Status: Wave 0 scaffold spec, from Roadmap v2 text and the v3 decision pack. Scope and acceptance criteria below are the v2 section text, kept as the source of truth until the project's wave opens its own spec pass.

Fleet node: BlackBoxV2. Wave: Wave 6.
Hiring evidence: scored in the fleet pass (new candidates P23 to P29: see the decision pack Sections 4 and 5) [confirmed, fleet and scoring pass 2026-11-04, or the decision pack for P23 to P29].

## Project section text (Roadmap v2, or the v3 candidate text for P23 to P29)

Subject: agent evaluation and harness engineering, distinct from the RAG eval harness in P06 (Round 3 research rank 2).
- Learn: score one agent on a fixed task set: success rate, steps, cost per task, with trajectory logs.
- Build: an eval suite with a private held-out task set, pass@k and variance, and a harness against model ablation table.
- Deep: a failure taxonomy (tool misuse, loop traps, silent wrong answers) with counts from real runs, and a contamination hygiene report.

## Acceptance criteria (scaffold level)

- Learn closes when the level-1-learn code runs, its README teaches the idea, and a fresh-eyes reader can follow it.
- Build closes when the system runs end to end, tests pass, and one benchmark or result table with method is in the README.
- Deep closes when the Deep scope in the section text is done, the failure modes are written, and the dossier is updated to ship state.
- No level closes on a claim. Evidence only: code, tests, numbers, links.
