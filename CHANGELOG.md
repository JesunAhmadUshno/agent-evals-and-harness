# Changelog

All notable changes to this project. Format: Keep a Changelog 1.1.
Versions follow Semantic Versioning. The tags v0.1, v0.5 and v1.0 were
cut under the old Learn / Build / Deep ladder; they are kept as they
are, and v1.0 there means "all three levels shipped", not the
"v1.0 Released" verdict of the portfolio standard v2. Under the
standard the repo is Functional, not pre-registered.

## [Unreleased]

### Changed
- 2026-11-08: Adopted the portfolio standard v2. README opens with
  the question, headline, field, job family and verdict, then
  Reproduce, Lifecycle and Layout. SPEC.md, NOVELTY.md and
  level-3-deep/DEEP-SPEC.md moved into PROPOSAL.md (not locked: no
  plan was locked before the runs). The three level READMEs,
  DOSSIER.md, docs/research-review.md and ROADMAP.md's backlog moved
  into REPORT.md; ROADMAP.md's shipped list moved here. Self-assigned
  grades and publicity scores left the public repo (grades are
  internal). PUBLICITY.md moved to fanout/PUBLICITY.md. docs/index.md
  (the legacy Pages summary, superseded by the dashboard) removed; its
  numbers are all in REPORT.md. Code, task files and results stay in
  the level folders (docs/decisions/0001).
- 2026-11-08: Dashboard reads the verdict and lifecycle from README.md,
  the recorded hashes and the backlog from REPORT.md, and no longer
  shows grades.
- 2026-11-08: CI runs with read-only token permissions, adds a layout
  test (required files, no public grade), and keeps the check that the
  committed results regenerate unchanged. CodeQL covers Python and
  JavaScript; Dependabot covers pip, npm (site/) and Actions.

### Added
- 2026-11-08: PROPOSAL.md draft of a confirmatory re-run on a real
  LLM-backed agent (not locked; open choices are the Owner's).
- 2026-11-08: CHANGELOG.md, CITATION.cff, SECURITY.md,
  docs/decisions/0001.
- 2026-11-07: Hygiene threshold sweep (level-3-deep/hygiene_sensitivity.py)
  with tests; CI fails when committed results drift from a fresh run.
- 2026-11-07: Live dashboard in site/: an exact JavaScript port of the
  Build harness and Deep classifier, checked against every recorded
  cell at build time, published by the Pages workflow.
- 2026-11-05: Written fan-out set in fanout/ (drafts; nothing posted).
- 2026-11-05: Actions polish pack: CI on Python 3.11 and 3.12 with
  ruff, CodeQL, Dependabot, release, labeler, greetings, stale.

## [1.0] - 2026-11-05 (ladder tag v1.0)

### Added
- Level 3, Deep (compressed): failure taxonomy with counts from real
  runs of the Build suite (4,500 attempts, 1,285 failures, six primary
  classes, counts sum to the failure total), plus a contamination
  hygiene report computed in code.

Compressed Deep note: under the December compression protocol,
Deep delivered the single hardest capability in the original scope
(the failure taxonomy with real-run counts, plus the hygiene report).
The rest of the v2 Deep scope is the v1.1 backlog in REPORT.md,
Future work. Nothing in the backlog is claimed as done.

## [0.5] - 2026-11-05 (ladder tag v0.5)

### Added
- Level 2, Build: eval suite with a 16-task dev set and a 20-task
  held-out set, pass@k and variance over 5 master seeds, and five toy
  component ablation variants.

## [0.1] - 2026-11-05 (ladder tag v0.1)

### Added
- Level 1, Learn: one deterministic toy agent (not an LLM) scored on a
  fixed 12-task set, with trajectory logs.
- 2026-11-04: Scaffold: scope spec, dossier, novelty draft (ae4304b).
