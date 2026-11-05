# agent-evals-and-harness

Agent evaluation as its own project: trajectory evals, a private held-out task set, harness against model ablation, contamination hygiene. Built in three levels with measured results at each level. The agent under test is a deterministic toy agent, not an LLM, and that is stated plainly in every level README.

- Learn: score one deterministic toy agent on a fixed 12-task set. 9 succeeded and 3 failed by design, success rate 0.75, all 12 matched expected outcomes, total steps 18, total cost 27 units.
- Build: an eval suite with a 16-task dev set and a 20-task held-out set, reported separately, pass@k and variance over 5 seeded master seeds, and a harness over five toy component ablation variants. Full variant: pass@1 0.9889, pass@3 1.0, pass@5 1.0, mean success 0.98.
- Deep (compressed): a failure taxonomy with counts from real runs of the Build suite (4,500 attempts, 1,285 failures, six primary classes summing to the failure total) and a contamination hygiene report computed in code (0 exact overlaps, 0 duplicates, 0 held-out answers in the toy agent code, one near neighbour pair disclosed).

Grades on record (of 10,000): Learn 8,700, Build 8,200, Deep 7,750.

Every number above is already published in this repo (README.md level write-ups) and reproduced by the runners in this repo, checked in CI. The full write-ups are in the level folders: level-1-learn, level-2-build, level-3-deep.

Releases: https://github.com/JesunAhmadUshno/agent-evals-and-harness/releases
