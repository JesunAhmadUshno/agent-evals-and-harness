# Website project page copy: agent-evals-and-harness

Site: jesunahmadushno.com
Status: COPY ONLY, draft for the project page. Dated 2026-11-05.
Nothing on any website was changed by this file.

## Headline

agent-evals-and-harness: count how an agent fails, not only how often it passes

## Summary

agent-evals-and-harness is an open agent evaluation harness built
by Jesun Ahmad Ushno as project P27 in Roadmap v3. It scores an
agent trajectory (the ordered tool calls an agent makes), runs
repeated trials with pass at k and component ablations, classifies
every failed attempt into one primary failure class, and computes
a contamination hygiene report in code. It runs on the Python
standard library only, with no model, no API, and no credential.

Two scope facts, stated plainly. The agent under test is a toy
deterministic agent, NOT an LLM. Held-out in this project means
unseen during development in this repo, NOT an external benchmark.

Status: v1.0, 2026-11-05. Learn, Build, and compressed Deep are
done. Grades on the house 10,000 scale: Learn 8,700, Build 8,200,
Deep 7,750. Total tests: 64 unit tests, plus the scaffold smoke
test, all passing at v1.0.

## Results

All results below are measured runs recorded in the level READMEs
and the results files in the GitHub repo. They describe a toy
deterministic agent, NOT an LLM, and they prove the evaluation
discipline, not real agent quality.

| Level | Set | Key result | Notes |
| --- | --- | --- | --- |
| Learn | 12 tasks | 9 succeeded, 3 failed by design, success 0.75, 12 of 12 matched | 18 steps, 27 cost units, 18 trajectory entries; 21 tests |
| Build | 36 tasks (16 dev, 20 held-out) | Full variant pass@1 0.9889, pass@3 1.000, pass@5 1.000, mean 0.980 | Minimal variant mean 0.4089; full dev mean 0.9775, held-out mean 0.982; 24 tests |
| Deep (compressed) | 4,500 attempts on the same 36 tasks | 3,215 passed, 1,285 failed | truncated_plan 1,000 (77.82 percent), silent_wrong_answer 185, tool_misuse 100; hygiene 0 exact overlaps, 0 duplicates; 19 tests, 64 total |

Held-out on this page means unseen during development in this
repo, NOT an external benchmark. The held-out tasks were authored
in this repo by the same author as the agent.

## Honest limits

- Toy agent only: a toy deterministic agent, NOT an LLM, at every
  level.
- Held-out is in-repo and same-author, NOT an external benchmark.
- Stochasticity is simulated with seeded slip rates, not sampled
  from a real model.
- loop_trap and excess_steps are zero by construction in this
  toy agent, which cannot loop or exceed its step bound.
- Cost is a fixed unit count, not money and not tokens.
- Compressed Deep is not the full v2 Deep scope. The remainder
  is the v1.1 backlog in the repo ROADMAP.md.

## Links

- GitHub repo: https://github.com/JesunAhmadUshno/agent-evals-and-harness
- Release v0.1 (Learn): https://github.com/JesunAhmadUshno/agent-evals-and-harness/releases/tag/v0.1
- Release v0.5 (Build): https://github.com/JesunAhmadUshno/agent-evals-and-harness/releases/tag/v0.5
- Release v1.0 (Learn, Build, compressed Deep): https://github.com/JesunAhmadUshno/agent-evals-and-harness/releases/tag/v1.0
- Tutorial: fanout/tutorial.md in the GitHub repo
- Blog post draft: fanout/blog-post.md in the GitHub repo

## License note

Code: Apache-2.0. Tutorials: CC BY 4.0.
