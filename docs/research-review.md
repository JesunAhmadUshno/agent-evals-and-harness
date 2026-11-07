# Research review: agent-evals-and-harness

A doctoral-style review of the three levels (Learn, Build, Deep) as a piece of research. Each criterion gets a grade (A strong, B adequate, C weak, D missing), the evidence for it, what was fixed in the `site/live-dashboard` change, and, for every gap that remains, the exact compute or data needed to close it.

Every number below is read from a committed file named next to it. Numbers the dashboard adds (unbiased pass@k, bootstrap intervals) are computed in the browser by `site/src/engine.js` and are labelled there as not part of the repo record.

## Summary

| Criterion | Grade | One line |
|---|---|---|
| Research question | B | Clear engineering question (how do you evaluate an agent harness), but answered on a toy agent only. |
| Hypotheses | C | No pre-stated hypotheses; ablation effects are fixed by construction. |
| Method | B | Clean, deterministic harness with dev and held-out sets kept apart. |
| Baselines | B | Five ablation variants, including an all-off `minimal` baseline; three on/off combinations never run in Python. |
| Statistics and uncertainty | C (was D) | Repo reports only population variance over 5 seeds; the dashboard now adds task-level bootstrap intervals and a paired test, labelled as added. |
| Reproducibility | A | Deterministic runners, recorded sha256 values, CI diff against committed results, and an independent second-language replay. |
| Threats to validity | B | Stated honestly in the READMEs; now shown next to every chart. |
| Related work | D | No citations in SPEC.md or DOSSIER.md; NOVELTY.md is a draft with "NO MEASUREMENT YET". |
| Limitations | B | Self-graded deductions are explicit and specific. |

## 1. Research question

The question is how to build an evaluation harness for agents: trajectory logging, a held-out set, pass@k with variance, component ablations, a failure taxonomy and contamination hygiene. It is well scoped as an engineering exercise. As a research question about agents it cannot be answered here, because the agent under test is a rule-following toy, not an LLM (stated in README.md and every level README).

**Remaining gap.** Run the same harness on a real agent. Needs: one LLM-backed agent (a local open-weights model on the fleet node, about 36 tasks x 5 seeds x 5 attempts = 900 runs per variant, 4,500 for five variants), plus the v1.1 "A real agent under test" item in ROADMAP.md.

## 2. Hypotheses

No hypothesis is written down before the runs. The ablation outcomes are fixed by how the toy is built: `truncated_plan` = 20 multi-step tasks x 2 planner-off variants x 25 attempts = 1,000 (level-3-deep/README.md hand check, reproduced by `engine.check.mjs`), and the verifier gap follows from two invented constants (slip 0.08 x difficulty, catch probability 0.85, level-2-build/eval_suite.py). The ablation therefore measures the simulator's parameters, not a discovery.

**Fixed now.** The dashboard's what-if sliders re-run the seeded engine under other slip and catch constants and under the three combinations the repo never ran, labelled "not in the repo record", so the dependence on invented constants is visible rather than only stated.

**Remaining gap.** Pre-register hypotheses (direction and minimum effect) before the real-agent run in section 1. Needs no compute, only a dated file committed before that run.

## 3. Method

Strong for a toy: 16 dev and 20 held-out tasks reported separately, 5 master seeds x 5 attempts, seed strings of the form `seed:variant:task:attempt`, a fixed-precedence classifier giving each failure exactly one class, and hygiene checks computed in code (level-3-deep/deep_analysis.py).

Weaknesses: 2 of 6 taxonomy classes (`loop_trap`, `excess_steps`) are unreachable by construction; `tool_misuse` comes from one mechanism; cost is abstract units on an invented price list.

**Remaining gap.** Human adjudication sample of failed attempts with an agreement rate. Needs: a real-agent run (section 1) and about 100 failed trajectories labelled by two people.

## 4. Baselines

Five variants (`full`, `no_planner`, `no_memory`, `no_verifier`, `minimal`) in results_build.json `ablation_table`. Mean attempt success there: full 0.98, no_planner 0.4411, no_memory 0.8744, no_verifier 0.8678, minimal 0.4089. The three single-component variants (planner only, memory only, verifier only) were never run in Python.

**Fixed now.** The dashboard runs all eight on/off combinations live and marks the three unrecorded ones in amber.

**Remaining gap.** Add the three combinations to `eval_suite.py` so they enter the record. Needs: seconds of CPU and a re-run of `run_build.py` (which changes the recorded sha256, so the README values must be updated together).

## 5. Statistics and uncertainty

The repo reports the population variance of 5 per-seed success rates, rounded to 4 places (several cells read 0 or 0.0001). That ignores task-to-task spread, which dominates: with 20 held-out tasks one task moves pass@k by 0.05. There were no confidence intervals and no paired comparison. pass@k is the "any of the first k attempts" definition (`pass_k_definition` in results_build.json), not the unbiased estimator 1 - C(n-c, k)/C(n, k) of Chen et al. (2021), and the choice was not discussed.

**Fixed now (in the dashboard, labelled as added).**
- Unbiased pass@k next to the repo's first-k pass@k for every variant, seed and split.
- Percentile bootstrap over tasks (2,000 resamples, fixed seed) for mean attempt success.
- Paired bootstrap over tasks of `full` minus each variant.
- Unrounded per-seed counts (for example 177/180) so the "0.0 variance" cells are explained.
- `engine.check.mjs` asserts the paired point estimate equals the recorded difference in mean success for every variant and split.

**Remaining gap.** Move these estimators into the Python record so they are part of the repo's results, not only the page. Needs: a stdlib function in `eval_suite.py` and a test; seconds of CPU.

## 6. Reproducibility

Strong. All three runners are deterministic; the READMEs record output sha256 values; `test_deep*` compares the saved JSON to a fresh run.

**Fixed now.**
- CI step `git diff --exit-code` over the four results files after the runners, so committed results cannot drift silently (.github/workflows/ci.yml).
- An independent JavaScript re-implementation (`site/src/engine.js`) of `ConfigurableToyAgent.run`, `score_attempt`, `pass_at_k`, `mean_and_variance`, the Deep classifier and the hygiene fingerprint, including a port of CPython's `random.Random(str)` seeding. `site/src/engine.check.mjs` asserts it reproduces every cell of results_build.json and the Deep taxonomy counts (by variant and by set); it runs inside `npm run build` and in CI.

**Remaining gap.** The runs used the Muse VM, not the assigned fleet node (self-deducted in level-3-deep/README.md). Needs: one re-run of the three runners on BlackBoxV2 (under a minute of CPU) and a sha256 comparison.

## 7. Threats to validity

- Construct: a toy agent with three switches; results describe the simulator.
- Internal: effect sizes fixed by construction (section 2).
- External: held-out set is same-author and in-repo with one reused template (D16/H20 at Jaccard 0.8, results_deep.json). Hygiene proves only that there is no exact leakage inside the repo.
- Measurement: the near-duplicate threshold of 0.9 was a single fixed value.

**Fixed now.** `level-3-deep/hygiene_sensitivity.py` sweeps the threshold from 0.30 to 1.00 over all 320 cross-set pairs (results_hygiene_sensitivity.json): 63 pairs at 0.30 or above, 1 at 0.80, and 0 from 0.85 upward, so the "0 near duplicates" result holds for any threshold of 0.85 or more. It has its own tests and a CI step.

**Remaining gap.** An externally authored held-out set and a contamination check against a named public corpus. Needs: about 20 tasks written by a second person, and the corpus files (for example a public agent benchmark's task texts) with their version recorded.

## 8. Related work

SPEC.md and DOSSIER.md contain no citations; NOVELTY.md is marked "DRAFT, PROPOSED" with "NO MEASUREMENT YET".

**Fixed now.** The dashboard's limits section names the comparison class as context only: pass@k and its unbiased estimator (Chen et al., 2021, "Evaluating Large Language Models Trained on Code"), and real-agent benchmarks SWE-bench (Jimenez et al., 2024), AgentBench (Liu et al., 2024), tau-bench (Yao et al., 2024) and Terminal-Bench (2025). No measured difference against them is claimed.

**Remaining gap.** A related-work section in DOSSIER.md with full references and a position statement. Needs: reading time only, no compute.

## 9. Limitations

The level READMEs self-grade (Learn 8,700, Build 8,200, Deep 7,750, of 10,000) with named deductions. These are self-assigned, and the dashboard labels them that way. The ROADMAP.md v1.1 backlog lists the main open items honestly.

## What this change did not do

- No new Python results were produced except the threshold sweep; every added estimator lives in the dashboard and is labelled.
- No paid API calls and no GPU work.
- The Pages source still has to be switched from the legacy `/docs` folder to GitHub Actions at ship time; `docs/index.md` stays in the repo.
