import { useMemo, useState, useEffect, useId } from 'react';
import suiteSrc from '../../level-2-build/eval_suite.py?raw';
import build from '../../level-2-build/results_build.json';
import devTasks from '../../level-2-build/tasks_dev.json';
import heldTasks from '../../level-2-build/tasks_heldout.json';
import deep from '../../level-3-deep/results_deep.json';
import sens from '../../level-3-deep/results_hygiene_sensitivity.json';
import learn from '../../level-1-learn/results_learn.json';
import learnMd from '../../level-1-learn/README.md?raw';
import buildMd from '../../level-2-build/README.md?raw';
import deepMd from '../../level-3-deep/README.md?raw';
import roadmapMd from '../../ROADMAP.md?raw';
import {
  parseSuite, runVariant, runAgent, summarize, taxonomy, draws, seedString, scoreAttempt, classifyFailure,
  unbiasedFromSeedRows, bootstrapTasks, pairedBootstrapDiff, BOOT_B, OFF_RECORD, TAXONOMY, fingerprintTokens, jaccard, handChecks,
} from './engine.js';
import { parseGrade, parseSha, parseBacklog } from './docs.js';

const REPO = 'https://github.com/JesunAhmadUshno/agent-evals-and-harness';
const blob = (p) => `${REPO}/blob/main/${p}`;
const pct = (x, d = 0) => `${(x * 100).toFixed(d)}%`;
const fmt = (n) => n.toLocaleString('en-US');
const show = (v) => (v === null || v === undefined ? 'none' : typeof v === 'string' ? `"${v}"` : String(v));

// ---------- data, all derived at build or load time ----------
const SUITE = parseSuite(suiteSrc);
const TASKS = [...devTasks.map((t) => ({ ...t, set: 'dev' })), ...heldTasks.map((t) => ({ ...t, set: 'heldout' }))];
const IDS = { dev: devTasks.map((t) => t.id), heldout: heldTasks.map((t) => t.id), all: TASKS.map((t) => t.id) };
const SPLITS = [['dev', `Dev (${IDS.dev.length})`], ['heldout', `Held-out (${IDS.heldout.length})`], ['all', `All (${IDS.all.length})`]];
const REPO_NAMES = Object.keys(SUITE.variants);
const COMBOS = { ...SUITE.variants, ...OFF_RECORD };
const DEFAULT_CONSTS = { slipPerDifficulty: SUITE.slipPerDifficulty, catchProb: SUITE.catchProb };
const runAll = (consts) => Object.fromEntries(Object.entries(COMBOS).map(([n, c]) => [n, runVariant(SUITE, n, c, TASKS, consts)]));
const BASE = runAll(DEFAULT_CONSTS);
// Key-order-insensitive equality (the results files are written with sorted keys).
const same = (a, b) => (a && b && typeof a === 'object' ? Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => same(a[k], b[k])) : a === b);
const strip = ({ seedRows, ...r }) => ({ ...r, pass_at_k: Object.fromEntries(Object.entries(r.pass_at_k).map(([k, v]) => [String(k), v])) });
const CELL_MATCH = REPO_NAMES.flatMap((n) => Object.keys(IDS).map((s) => same(strip(summarize(SUITE, BASE[n], IDS[s])), build.variants[n][s])));
const BASE_TAX = taxonomy(Object.fromEntries(REPO_NAMES.map((n) => [n, BASE[n]])));
const TAX_MATCH = same(BASE_TAX.counts, deep.taxonomy.taxonomy_counts) && same(BASE_TAX.byVariant, deep.taxonomy.taxonomy_by_variant) && same(BASE_TAX.bySet, deep.taxonomy.taxonomy_by_set);
const ab = Object.fromEntries(build.ablation_table.map((r) => [r.variant, r]));
const nameOf = (cfg) => Object.keys(COMBOS).find((n) => ['planner', 'memory', 'verifier'].every((k) => COMBOS[n][k] === cfg[k]));
const GRADES = [['Learn', learnMd, 'level-1-learn/README.md'], ['Build', buildMd, 'level-2-build/README.md'], ['Deep', deepMd, 'level-3-deep/README.md']].map(([l, md, p]) => ({ level: l, path: p, sha: parseSha(md), ...parseGrade(md) }));
const BACKLOG = parseBacklog(roadmapMd);
const CLASS_COLORS = { truncated_plan: 'var(--primary)', silent_wrong_answer: 'var(--warn)', tool_misuse: 'var(--bad)', loop_trap: '#8a7fd1', excess_steps: '#3aa6a0', other_wrong_answer: 'var(--muted)' };

const SECTIONS = [['top', 'Overview', '◎'], ['learn', 'Learn', '▤'], ['lab', 'Ablation lab', '⚗'], ['ablation', 'Ablation table', '▥'], ['passk', 'pass@k', 'k'], ['deep', 'Taxonomy', '◔'], ['explorer', 'Attempt explorer', '⌕'], ['hygiene', 'Hygiene', '✓'], ['limits', 'Limits', '!'], ['reproduce', 'Reproduce', '❯_']];

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.08 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

function MenuBar() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  return (
    <div className="menubar" role="banner">
      <span className="apple" aria-hidden="true">◆</span>
      <a className="app" href="#top">Agent Evals Harness</a>
      <a className="m" href={blob('level-1-learn/README.md')}>Learn</a>
      <a className="m" href={blob('level-2-build/README.md')}>Build</a>
      <a className="m" href={blob('level-3-deep/README.md')}>Deep</a>
      <a className="m" href={blob('docs/research-review.md')}>Review</a>
      <span className="spacer" />
      <span className="status"><i /> {CELL_MATCH.every(Boolean) ? 'Replay matches record' : 'Replay mismatch'}</span>
      <a href={REPO}>GitHub ↗</a>
      <span className="clock">{now.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</span>
    </div>
  );
}

function Dock() {
  const [active, setActive] = useState('top');
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-45% 0px -50% 0px' });
    SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  return (
    <nav className="dock" aria-label="Sections">
      {SECTIONS.map(([id, label, icon]) => (
        <a key={id} href={`#${id}`} className={active === id ? 'on' : ''} aria-current={active === id ? 'true' : undefined}>
          <span className="ico" aria-hidden="true">{icon}</span><span className="lbl">{label}</span>
        </a>
      ))}
    </nav>
  );
}

function Range({ label, value, min, max, step, onChange, show: shown }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label} <span>{shown}</span></label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

function Seg({ label, value, onChange, options }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([k, l]) => <button key={k} aria-pressed={value === k} onClick={() => onChange(k)}>{l}</button>)}
    </div>
  );
}

const Match = ({ ok, what = 'results_build.json' }) => <span className={`pill ${ok ? 'good' : 'bad'}`}>{ok ? '✓' : '✗'} {ok ? 'matches' : 'differs from'} {what}</span>;
const seedOptions = [['all', `All ${SUITE.masterSeeds.length} seeds`], ...SUITE.masterSeeds.map((s, i) => [String(i), `Seed ${s}`])];

export default function App() {
  useReveal();
  const [consts, setConsts] = useState(DEFAULT_CONSTS);
  const isDefault = consts.slipPerDifficulty === DEFAULT_CONSTS.slipPerDifficulty && consts.catchProb === DEFAULT_CONSTS.catchProb;
  const live = useMemo(() => (isDefault ? BASE : runAll(consts)), [consts, isDefault]);
  return (
    <div className="wrap">
      <MenuBar />
      <div className="glow" aria-hidden="true" />
      <Hero />
      <Learn />
      <Lab consts={consts} setConsts={setConsts} isDefault={isDefault} live={live} />
      <Ablation />
      <PassK />
      <Taxonomy live={live} isDefault={isDefault} />
      <Explorer consts={consts} isDefault={isDefault} />
      <Hygiene />
      <Limits />
      <Reproduce />
      <Dock />
      <footer>
        Every number on this page is read at build time from <code>level-*/results_*.json</code>, the task files, <code>eval_suite.py</code> and the level READMEs, or computed live in your browser by a JavaScript port of the harness that <code>npm run build</code> checks against those files. Code: Apache-2.0.
      </footer>
    </div>
  );
}

function Hero() {
  const t = deep.taxonomy, full = ab.full, np = ab.no_planner;
  return (
    <header className="card hero window" id="top" data-title="harness.app — README">
      <div className="head">
        <p className="eyebrow">Toy agent eval harness · replayed live</p>
        <span className={`pill ${CELL_MATCH.every(Boolean) ? 'good' : 'bad'}`}>● Live replay: {CELL_MATCH.filter(Boolean).length}/{CELL_MATCH.length} result cells match</span>
      </div>
      <h1>A toy agent’s {fmt(t.total_attempts)} seeded attempts, re-run in your browser: turning off its planner cuts mean success from <em>{pct(full.mean_success)} to {pct(np.mean_success)}</em>.</h1>
      <p className="sub">
        This repo builds an evaluation harness in three levels: a scored trajectory log (Learn), a dev and held-out suite with pass@k, variance and component ablations (Build), and a failure taxonomy with a contamination hygiene report (Deep).
        The page below re-runs the Build harness attempt by attempt, using a JavaScript port with the same seeded random numbers as CPython, and checks every cell against the committed results.
      </p>
      <div className="scope" role="note">
        <b>Honest scope.</b> The agent is a rule-following toy, not an LLM, and the ablations switch toy components, not models.
        “Held-out” means written in this repo by the same author and kept out of development, not an external benchmark.
        Its only randomness is an invented slip rate of {SUITE.slipPerDifficulty} × task difficulty, caught by the verifier with an invented probability of {SUITE.catchProb}.
      </div>
      <div className="actions">
        <a className="btn primary" href="#lab">Open the ablation lab</a>
        <a className="btn ghost" href={blob('docs/research-review.md')}>Read the research review</a>
        <span className="hint">Reproduce with <code>python level-2-build/run_build.py</code></span>
      </div>
      <div className="tiles five">
        <div className="tile"><div className="num">{build.dev_tasks + build.heldout_tasks}</div><div className="cap">tasks: {build.dev_tasks} dev, {build.heldout_tasks} held-out</div></div>
        <div className="tile"><div className="num">{build.master_seeds.length}×{build.attempts_per_task}</div><div className="cap">master seeds × attempts per task</div></div>
        <div className="tile"><div className="num">{fmt(t.total_attempts)}</div><div className="cap">attempts over {REPO_NAMES.length} variants</div></div>
        <div className="tile"><div className="num">{fmt(t.failed_attempts)}</div><div className="cap">failed attempts, each given one class</div></div>
        <div className="tile"><div className="num">{full.pass_at_1}</div><div className="cap">full-variant pass@1, all tasks</div></div>
      </div>
    </header>
  );
}

function Learn() {
  const [sel, setSel] = useState(learn.tasks[0].task_id);
  const task = learn.tasks.find((t) => t.task_id === sel);
  const cats = Object.entries(learn.summary.per_category);
  const metrics = [['success_rate', 'Success rate', 1], ['mean_steps', 'Mean steps', Math.max(...cats.map(([, c]) => c.mean_steps))], ['mean_cost_units', 'Mean cost units', Math.max(...cats.map(([, c]) => c.mean_cost_units))]];
  const s = learn.summary;
  return (
    <section id="learn" className="card window reveal" data-title="run_learn.py — recorded trajectories">
      <div className="head">
        <div>
          <p className="eyebrow">Level 1 · Learn</p>
          <h2>Every task, every tool call logged.</h2>
          <p className="sub">
            One deterministic toy agent on a fixed {s.total_tasks}-task set: {s.succeeded} succeeded, {s.failed} failed by design, and {s.matches_expected} of {s.total_tasks} matched the expected answer or failure label.
            It used {s.total_steps} steps and {s.total_cost_units} cost units in total (units on a fixed price list, not tokens or money). Pick a task to read its trajectory.
          </p>
        </div>
        <span className="pill info">Recorded replay of results_learn.json</span>
      </div>
      <div className="tasklist" role="group" aria-label="Learn tasks">
        {learn.tasks.map((t) => (
          <button key={t.task_id} aria-pressed={sel === t.task_id} onClick={() => setSel(t.task_id)}>
            <b>{t.task_id}</b><small>{t.category}</small><i className={t.matches_expected ? 'ok' : 'no'}>{t.agent_outcome}</i>
          </button>
        ))}
      </div>
      <div className="grid2" style={{ marginTop: 16 }}>
        <div>
          <h3>{task.task_id} · {task.category}</h3>
          <p className="hint" style={{ margin: '4px 0 8px' }}>
            Expected {task.expected_outcome}{task.expected_outcome === 'success' ? `, ${show(task.expected_answer)}` : `, label ${task.expected_failure_label}`}.
            Agent: {task.agent_outcome}{task.agent_outcome === 'success' ? `, ${show(task.agent_answer)}` : `, label ${task.failure_label}`}. {task.steps} steps, {task.cost_units} cost units.
            {' '}<span className={task.matches_expected ? 'ok' : 'no'}>{task.matches_expected ? 'Matches expected.' : 'Does not match.'}</span>
          </p>
          <Trajectory rows={task.trajectory} />
        </div>
        <div>
          <h3>Per category</h3>
          {metrics.map(([k, label, max]) => <CatBars key={k} cats={cats} k={k} label={label} max={max} />)}
        </div>
      </div>
    </section>
  );
}

function CatBars({ cats, k, label, max }) {
  const W = 420, rowH = 22, H = cats.length * rowH + 8, l = 120;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label={`${label} by task category, Learn level`} style={{ marginTop: 10 }}>
      <text x={0} y={11} style={{ fill: 'var(--text)', fontWeight: 600 }}>{label}</text>
      {cats.map(([c, v], i) => (
        <g key={c} transform={`translate(0 ${i * rowH + 24})`}>
          <text x={0} y={10}>{c}</text>
          <rect x={l} y={0} width={W - l - 50} height={13} rx={6} fill="var(--primary-pale)" />
          <rect x={l} y={0} width={Math.max(0, ((W - l - 50) * v[k]) / max)} height={13} rx={6} fill={c === 'designed-failure' ? 'var(--warn)' : 'var(--primary)'} />
          <text x={W - 44} y={10} style={{ fill: 'var(--text)' }}>{v[k]}</text>
        </g>
      ))}
    </svg>
  );
}

function Trajectory({ rows }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead><tr><th>Step</th><th>Tool</th><th>Args</th><th>Result / error</th><th>Label</th><th>Cost</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.step}><td>{r.step}</td><td className="mono">{r.tool}</td><td className="mono">{JSON.stringify(r.args)}</td>
              <td>{r.error ? <span className="no">{r.error}</span> : <span className="mono">{show(r.result)}</span>}</td>
              <td className="mono">{r.failure_label ?? '—'}</td><td>{r.cost_units}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Lab({ consts, setConsts, isDefault, live }) {
  const [cfg, setCfg] = useState(SUITE.variants.full);
  const [seed, setSeed] = useState('all');
  const [split, setSplit] = useState('all');
  const name = nameOf(cfg), isRepo = REPO_NAMES.includes(name);
  const S = useMemo(() => summarize(SUITE, live[name], IDS[split]), [live, name, split]);
  const rec = isRepo ? build.variants[name][split] : null, i = seed === 'all' ? null : +seed;
  const cmp = isRepo && isDefault;
  const v = i === null
    ? [['pass@1', S.pass_at_k[1], rec?.pass_at_k['1']], ['pass@3', S.pass_at_k[3], rec?.pass_at_k['3']], ['pass@5', S.pass_at_k[5], rec?.pass_at_k['5']], ['Mean success', S.mean_attempt_success_rate, rec?.mean_attempt_success_rate], ['Variance over seeds', S.variance_attempt_success_rate, rec?.variance_attempt_success_rate], ['Mean steps', S.mean_steps, rec?.mean_steps], ['Mean cost units', S.mean_cost_units, rec?.mean_cost_units]]
    : [['pass@1', S.seedRows[i].passK[1]], ['pass@3', S.seedRows[i].passK[3]], ['pass@5', S.seedRows[i].passK[5]], ['Attempt success', S.seedRows[i].rate, rec?.per_seed_success_rates[i]], ['Mean steps', S.seedRows[i].steps], ['Mean cost units', S.seedRows[i].cost]];
  const bars = Object.keys(COMBOS).map((n) => ({ n, v: summarize(SUITE, live[n], IDS[split]).mean_attempt_success_rate, rec: REPO_NAMES.includes(n) ? build.variants[n][split].mean_attempt_success_rate : null }));
  const W = 960, rowH = 30, l = 150, H = bars.length * rowH + 26, x = (val) => l + val * (W - l - 70);
  return (
    <section id="lab" className="card window reveal" data-title="eval_suite.py — live ablation lab">
      <div className="head">
        <div>
          <p className="eyebrow">Level 2 · Build · live in your browser</p>
          <h2>Switch components off and re-run the harness.</h2>
          <p className="sub">
            Each toggle changes the toy agent, then the page re-runs {SUITE.masterSeeds.length} seeds × {IDS[split].length} tasks × {SUITE.attempts} attempts with the repo’s own seed strings.
            For the {REPO_NAMES.length} variants the repo ran, each number is checked against <a href={blob('level-2-build/results_build.json')}>results_build.json</a>.
            The {Object.keys(OFF_RECORD).length} other combinations and any change to the two constants are <b>not in the repo record</b>; they are shown so you can see that the gaps follow from the invented constants.
          </p>
        </div>
        <span className={`pill ${cmp ? 'good' : 'warn'}`}>{cmp ? `Variant “${name}”, recorded settings` : isRepo ? `“${name}”, what-if constants` : `“${name}”: never run in the repo`}</span>
      </div>
      <div className="controls">
        <div className="field"><span className="flabel">Components</span>
          <div className="toggles">
            {['planner', 'memory', 'verifier'].map((k) => (
              <label key={k} className="toggle"><input type="checkbox" checked={cfg[k]} onChange={(e) => setCfg({ ...cfg, [k]: e.target.checked })} /> {k}</label>
            ))}
          </div>
        </div>
        <Select label="Master seed" value={seed} onChange={setSeed} options={seedOptions} />
        <div className="field"><span className="flabel">Task split</span><Seg label="Task split" value={split} onChange={setSplit} options={SPLITS} /></div>
      </div>
      <div className="controls">
        <Range label="What-if: slip rate per difficulty" value={consts.slipPerDifficulty} min={0} max={0.3} step={0.01} onChange={(val) => setConsts({ ...consts, slipPerDifficulty: val })} show={consts.slipPerDifficulty.toFixed(2)} />
        <Range label="What-if: verifier catch probability" value={consts.catchProb} min={0} max={1} step={0.05} onChange={(val) => setConsts({ ...consts, catchProb: val })} show={consts.catchProb.toFixed(2)} />
        <div className="field"><span className="flabel">Constants</span>
          <button className="btn ghost" onClick={() => setConsts(DEFAULT_CONSTS)} disabled={isDefault}>{isDefault ? 'Repo values in use' : 'Reset to repo values'}</button>
        </div>
      </div>
      <div className="tiles metrics">
        {v.map(([k, val, r]) => (
          <div className="tile" key={k}>
            <div className="num">{val}</div><div className="cap">{k}</div>
            {cmp && r !== undefined ? <span className={`pill ${val === r ? 'good' : 'bad'}`}>{val === r ? '✓ matches record' : `✗ record ${r}`}</span> : r !== undefined && r !== null ? <span className="pill warn">recorded {r}</span> : !isRepo ? <span className="pill warn">off-record</span> : <span className="pill info">live</span>}
          </div>
        ))}
      </div>
      <h3 style={{ marginTop: 24 }}>Mean attempt success, all eight on/off combinations ({SPLITS.find((s) => s[0] === split)[1]})</h3>
      <div className="wide" style={{ overflowX: 'auto' }}><svg className="chart" style={{ minWidth: 620 }} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Mean attempt success for all eight component combinations at the current constants, with recorded values as ticks">
        {[0, 0.25, 0.5, 0.75, 1].map((tk) => <g key={tk}><line className="axis" x1={x(tk)} x2={x(tk)} y1={0} y2={H - 20} /><text x={x(tk)} y={H - 6} textAnchor="middle">{pct(tk)}</text></g>)}
        {bars.map((b, j) => (
          <g key={b.n} transform={`translate(0 ${j * rowH + 6})`} opacity={b.n === name ? 1 : 0.75}>
            <text x={0} y={14} style={{ fill: 'var(--text)', fontWeight: b.n === name ? 700 : 400 }}>{b.n}{b.rec === null ? ' *' : ''}</text>
            <rect x={l} y={2} width={x(b.v) - l} height={16} rx={5} fill={b.rec === null ? 'var(--warn)' : 'var(--primary)'} />
            {b.rec !== null && <rect x={x(b.rec) - 1} y={-2} width={2.5} height={24} fill="var(--text)" />}
            <text x={x(b.v) + 6} y={14} style={{ fill: 'var(--text)' }}>{b.v}</text>
          </g>
        ))}
      </svg></div>
      <p className="hint">Black ticks are the recorded values in results_build.json. * marks combinations the repo never ran (seeded as “{Object.keys(OFF_RECORD).join('”, “')}”), shown in amber.</p>
    </section>
  );
}

function Ablation() {
  const ks = SUITE.passKs, W = 960, H = 280, pad = { l: 40, r: 10, t: 14, b: 54 };
  const gw = (W - pad.l - pad.r) / REPO_NAMES.length, bw = (gw - 34) / (ks.length * 2);
  const y = (v) => pad.t + (1 - v) * (H - pad.t - pad.b);
  const op = { 1: 1, 3: 0.7, 5: 0.45 };
  const [hover, setHover] = useState(null);
  const seedLive = Object.fromEntries(REPO_NAMES.map((n) => [n, summarize(SUITE, BASE[n], IDS.all).seedRows]));
  const total = IDS.all.length * SUITE.attempts;
  return (
    <section id="ablation" className="card window reveal" data-title="results_build.json — ablation table">
      <p className="eyebrow">Recorded results · dev and held-out kept apart</p>
      <h2>Removing the planner costs the most; removing the verifier mostly hurts pass@1.</h2>
      <p className="sub">
        pass@1, pass@3 and pass@5 for each variant, with dev (blue) and held-out (green) side by side, never merged.
        Planner-off variants stop multi-step tasks at step one, so retries cannot help. The verifier only fixes seeded slips, so extra attempts recover most of its loss.
      </p>
      <div className="wide" style={{ overflowX: 'auto', marginTop: 12 }}><svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Grouped bars of pass at k for five variants, dev and held-out sets side by side" onMouseLeave={() => setHover(null)} style={{ minWidth: 680 }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => <g key={t}><line className="axis" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} /><text x={pad.l - 6} y={y(t) + 4} textAnchor="end">{t}</text></g>)}
        {REPO_NAMES.map((n, gi) => (
          <g key={n} transform={`translate(${pad.l + gi * gw + 17} 0)`}>
            {['dev', 'heldout'].map((s, si) => ks.map((k, ki) => {
              const v = build.variants[n][s].pass_at_k[String(k)], xx = (si * ks.length + ki) * bw + si * 6;
              return <rect key={s + k} x={xx} y={y(v)} width={bw - 2} height={y(0) - y(v)} rx={3} fill={s === 'dev' ? 'var(--primary)' : 'var(--good)'} opacity={op[k] ?? 0.6}
                onMouseEnter={() => setHover(`${n}, ${s === 'dev' ? 'dev' : 'held-out'}: pass@${k} = ${v}`)} />;
            }))}
            <text x={(gw - 34) / 2} y={H - pad.b + 18} textAnchor="middle" style={{ fill: 'var(--text)' }}>{n}</text>
            <text x={(gw - 34) / 4} y={H - pad.b + 34} textAnchor="middle">dev</text>
            <text x={(3 * (gw - 34)) / 4} y={H - pad.b + 34} textAnchor="middle">held-out</text>
          </g>
        ))}
      </svg></div>
      <div className="tip" aria-live="polite">{hover ?? 'Bars within each set: pass@1 (solid), pass@3, pass@5 (lighter). Hover a bar for its value.'}</div>
      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table>
          <thead><tr><th>Variant</th><th>Planner</th><th>Memory</th><th>Verifier</th><th>pass@1</th><th>pass@3</th><th>pass@5</th><th>Mean success</th><th>Variance</th><th>Steps</th><th>Cost</th></tr></thead>
          <tbody>
            {build.ablation_table.map((r) => (
              <tr key={r.variant}><td className="mono">{r.variant}</td>{['planner', 'memory', 'verifier'].map((k) => <td key={k} className={r.components[k] ? 'ok' : 'no'}>{r.components[k] ? 'on' : 'off'}</td>)}
                <td>{r.pass_at_1}</td><td>{r.pass_at_3}</td><td>{r.pass_at_5}</td><td>{r.mean_success}</td><td>{r.variance}</td><td>{r.mean_steps}</td><td>{r.mean_cost_units}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 style={{ marginTop: 22 }}>Per-seed attempt success behind the variance column (all {IDS.all.length} tasks)</h3>
      <p className="hint" style={{ marginTop: 4, marginBottom: 10 }}>Each dot is one master seed. The recorded rates are rounded to 4 places; the live counts show the exact passed attempts out of {total}. Variance is the population variance of these {SUITE.masterSeeds.length} numbers, so a column of 0.0 means the five seeds were (almost) identical.</p>
      <div className="strips">
        {REPO_NAMES.map((n) => {
          const rates = build.variants[n].all.per_seed_success_rates, lo = 0.35, hi = 1;
          return (
            <div key={n} className="strip">
              <span className="mono">{n}</span>
              <svg className="chart" viewBox="0 0 400 26" role="img" aria-label={`Per-seed success rates for ${n}`}>
                <line className="axis" x1={4} x2={396} y1={13} y2={13} />
                {rates.map((r, i) => <circle key={i} cx={4 + ((r - lo) / (hi - lo)) * 392} cy={13} r={5} fill="var(--primary)" opacity={0.55} />)}
              </svg>
              <span className="hint">{seedLive[n].map((sr) => `${sr.matrix.reduce((s, row) => s + row.filter(Boolean).length, 0)}/${total}`).join(' · ')}</span>
            </div>
          );
        })}
      </div>
      <p className="hint">Dot scale 35% to 100%. Seeds in order {build.master_seeds.join(', ')}.</p>
    </section>
  );
}

function PassK() {
  const [name, setName] = useState('no_verifier');
  const [seed, setSeed] = useState('0');
  const [split, setSplit] = useState('heldout');
  const [k, setK] = useState(1);
  const S = useMemo(() => summarize(SUITE, BASE[name], IDS[split]), [name, split]);
  const m = S.seedRows[+seed].matrix, ids = IDS[split], n = SUITE.attempts;
  const firstK = m.filter((row) => row.slice(0, k).some(Boolean)).length / m.length;
  const unb = m.reduce((s, row) => s + unbiasedFromSeedRows([{ matrix: [row] }], k), 0) / m.length;
  const W = 960, cw = Math.min(40, (W - 70) / ids.length), H = n * cw + 46;
  const ci = useMemo(() => bootstrapTasks(S.seedRows), [S]);
  const pd = useMemo(() => (name === 'full' ? null : pairedBootstrapDiff(summarize(SUITE, BASE.full, IDS[split]).seedRows, S.seedRows)), [name, split, S]);
  const ks = Array.from({ length: n }, (_, i) => i + 1);
  return (
    <section id="passk" className="card window reveal" data-title="pass_at_k.calc — live">
      <div className="head">
        <div>
          <p className="eyebrow">pass@k explained · added estimators labelled</p>
          <h2>Two ways to read the same attempt grid.</h2>
          <p className="sub">
            The repo’s pass@k counts a task as passed if <b>any of its first k attempts</b> passed. The common unbiased estimator (Chen et al., 2021) instead averages over every way of picking k of the n = {n} attempts: 1 − C(n−c, k) / C(n, k), where c is the number of passes.
            Both agree at k = 1 in expectation and exactly at k = n; in between, the first-k version depends on attempt order. Click a row of the grid to set k.
          </p>
        </div>
        <span className="pill warn">Unbiased estimator and intervals: computed here, not in the repo record</span>
      </div>
      <div className="controls">
        <Select label="Variant" value={name} onChange={setName} options={REPO_NAMES.map((x) => [x, x])} />
        <Select label="Master seed" value={seed} onChange={setSeed} options={seedOptions.slice(1)} />
        <div className="field"><span className="flabel">Task split</span><Seg label="pass@k task split" value={split} onChange={setSplit} options={SPLITS} /></div>
        <Range label="k (attempts considered)" value={k} min={1} max={n} step={1} onChange={setK} show={k} />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Attempt grid: ${ids.length} tasks by ${n} attempts for ${name}`} style={{ minWidth: 520 }}>
          {ks.map((a) => <text key={a} x={60} y={a * cw - cw / 2 + 4 + 14} textAnchor="end">attempt {a}</text>)}
          {ids.map((id, ti) => (
            <g key={id} transform={`translate(${66 + ti * cw} 14)`}>
              {m[ti].map((p, a) => (
                <rect key={a} x={1} y={a * cw + 1} width={cw - 2} height={cw - 2} rx={3} style={{ cursor: 'pointer' }} onClick={() => setK(a + 1)}
                  fill={p ? 'var(--good)' : 'var(--bad)'} opacity={a < k ? 0.9 : 0.18} />
              ))}
              <text x={cw / 2} y={n * cw + 14} textAnchor="middle" style={{ fill: m[ti].slice(0, k).some(Boolean) ? 'var(--good)' : 'var(--bad)', fontWeight: 700 }}>{m[ti].slice(0, k).some(Boolean) ? '✓' : '✗'}</text>
            </g>
          ))}
          <text x={66} y={10}>{ids[0]} … {ids[ids.length - 1]}</text>
        </svg>
      </div>
      <div className="tiles" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <div className="tile"><div className="num">{firstK.toFixed(4)}</div><div className="cap">repo pass@{k}, first {k} attempts (this seed)</div></div>
        <div className="tile"><div className="num">{unb.toFixed(4)}</div><div className="cap">unbiased pass@{k} from all {n} attempts (added)</div></div>
        <div className="tile"><div className="num">{(firstK - unb >= 0 ? '+' : '') + (firstK - unb).toFixed(4)}</div><div className="cap">difference, first-k minus unbiased</div></div>
      </div>
      <h3 style={{ marginTop: 22 }}>All {SUITE.masterSeeds.length} seeds for {name}, {SPLITS.find((s) => s[0] === split)[1]}</h3>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>k</th><th>Repo first-k pass@k (live)</th><th>Recorded</th><th>Unbiased pass@k (added)</th></tr></thead>
          <tbody>
            {ks.map((kk) => {
              const fk = S.seedRows.reduce((s, sr) => s + sr.matrix.filter((row) => row.slice(0, kk).some(Boolean)).length / sr.matrix.length, 0) / S.seedRows.length;
              const recd = build.variants[name][split].pass_at_k[String(kk)];
              return <tr key={kk}><td>{kk}</td><td>{fk.toFixed(4)}</td><td>{recd ?? <span className="hint">not recorded</span>}</td><td>{unbiasedFromSeedRows(S.seedRows, kk).toFixed(4)}</td></tr>;
            })}
          </tbody>
        </table>
      </div>
      <p className="hint">
        Bootstrap over tasks (added, {fmt(BOOT_B)} resamples, fixed seed): mean attempt success {ci.point.toFixed(4)}, 95% interval {ci.lo.toFixed(4)} to {ci.hi.toFixed(4)}.
        The repo reports only the variance across {SUITE.masterSeeds.length} seeds, which ignores task-to-task spread; with {ids.length} tasks, one task moves pass@k by {(1 / ids.length).toFixed(4)}.
        {pd && <> Paired bootstrap over the same tasks (added): full minus {name} = {pd.point.toFixed(4)}, 95% interval {pd.lo.toFixed(4)} to {pd.hi.toFixed(4)}, from {pd.tasksDiffering} of {ids.length} tasks that differ.</>}
      </p>
    </section>
  );
}

function StackBars({ rows, label }) {
  const W = 960, rowH = 34, l = 130, H = rows.length * rowH + 8, max = Math.max(...rows.map(([, c]) => TAXONOMY.reduce((s, k) => s + c[k], 0)));
  const x = (v) => (v / max) * (W - l - 70);
  return (
    <div className="wide" style={{ overflowX: 'auto' }}><svg className="chart" style={{ minWidth: 620 }} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {rows.map(([name, c], i) => {
        let acc = 0; const total = TAXONOMY.reduce((s, k) => s + c[k], 0);
        return (
          <g key={name} transform={`translate(0 ${i * rowH + 4})`}>
            <text x={0} y={17} style={{ fill: 'var(--text)' }}>{name}</text>
            {TAXONOMY.map((k) => { const w = x(c[k]); const r = <rect key={k} x={l + x(acc)} y={4} width={w} height={18} fill={CLASS_COLORS[k]}><title>{`${k}: ${c[k]}`}</title></rect>; acc += c[k]; return r; })}
            <text x={l + x(total) + 6} y={17} style={{ fill: 'var(--text)' }}>{fmt(total)}</text>
          </g>
        );
      })}
    </svg></div>
  );
}

function Taxonomy({ live, isDefault }) {
  const t = deep.taxonomy, hc = handChecks(SUITE, TASKS);
  const liveTax = useMemo(() => taxonomy(Object.fromEntries(REPO_NAMES.map((n) => [n, live[n]]))), [live]);
  const svByVariant = REPO_NAMES.map((n) => t.taxonomy_by_variant[n].silent_wrong_answer);
  return (
    <section id="deep" className="card window reveal" data-title="deep_analysis.py — failure taxonomy">
      <div className="head">
        <div>
          <p className="eyebrow">Level 3 · Deep</p>
          <h2>{fmt(t.failed_attempts)} failures, one class each, and most are built in.</h2>
          <p className="sub">
            Every failed attempt gets exactly one primary class, applied in a fixed order. The counts are from results_deep.json; the badge confirms the in-browser classifier, run over the replayed attempt stream, gets the same numbers.
            {" "}{ZERO_CLASSES} classes cannot occur in this toy by construction, so their zero counts say nothing about real agents.
          </p>
        </div>
        <Match ok={TAX_MATCH} what="results_deep.json" />
      </div>
      <div className="legend">{TAXONOMY.map((k) => <span key={k}><i style={{ background: CLASS_COLORS[k] }} />{k} ({fmt(t.taxonomy_counts[k])})</span>)}</div>
      <h3 style={{ marginTop: 16 }}>By variant ({fmt(t.total_by_variant.full)} attempts each)</h3>
      <StackBars rows={REPO_NAMES.map((n) => [n, t.taxonomy_by_variant[n]])} label="Stacked failure classes by variant" />
      <h3 style={{ marginTop: 8 }}>By task set</h3>
      <StackBars rows={[['dev', t.taxonomy_by_set.dev], ['held-out', t.taxonomy_by_set.heldout]]} label="Stacked failure classes by task set" />
      <div className="grid2" style={{ marginTop: 18 }}>
        <div>
          <h3>Precedence (first rule that fires wins)</h3>
          <ol className="prec">{deep.taxonomy_precedence.map((k) => <li key={k}><span className="mono">{k}</span></li>)}</ol>
          <h3 style={{ marginTop: 14 }}>The README’s hand checks, recomputed from the task files</h3>
          <p className="hint" style={{ margin: '6px 0' }}>truncated_plan: {hc.multi} multi-step tasks ({hc.multiDev} dev + {hc.multiHeld} held-out) × {hc.plannerOff.length} planner-off variants × {hc.perTaskPerVariant} attempts = <b>{fmt(hc.truncated)}</b>.</p>
          <p className="hint" style={{ margin: '6px 0' }}>tool_misuse: {hc.recall.length} recall tasks ({hc.recall.join(', ')}) × {hc.memOnlyOff.length} variant ({hc.memOnlyOff.join(', ')}) × {hc.perTaskPerVariant} = <b>{fmt(hc.toolMisuse)}</b>.</p>
          <p className="hint" style={{ margin: '6px 0' }}>silent_wrong_answer: {svByVariant.join(' + ')} = <b>{svByVariant.reduce((a, b) => a + b, 0)}</b>.</p>
        </div>
        <div>
          <h3>Live recount{isDefault ? '' : ' under the what-if constants'}</h3>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Class</th><th>Recorded</th><th>{isDefault ? 'Live' : 'What-if (off-record)'}</th></tr></thead>
              <tbody>
                {TAXONOMY.map((k) => <tr key={k}><td className="mono">{k}</td><td>{fmt(t.taxonomy_counts[k])}</td><td className={isDefault ? (liveTax.counts[k] === t.taxonomy_counts[k] ? 'ok' : 'no') : ''}>{fmt(liveTax.counts[k])}</td></tr>)}
                <tr><td><b>failed / total</b></td><td>{fmt(t.failed_attempts)} / {fmt(t.total_attempts)}</td><td>{fmt(liveTax.failed)} / {fmt(liveTax.total)}</td></tr>
              </tbody>
            </table>
          </div>
          <p className="hint">{isDefault ? 'Change the constants in the ablation lab to re-classify under a different slip model.' : 'The structural classes do not move; only silent wrong answers follow the invented constants.'}</p>
        </div>
      </div>
    </section>
  );
}

function Explorer({ consts, isDefault }) {
  const [name, setName] = useState('no_verifier');
  const [seed, setSeed] = useState('0');
  const [taskId, setTaskId] = useState('D13');
  const [a, setA] = useState('0');
  const task = TASKS.find((t) => t.id === taskId), cfg = COMBOS[name];
  const ss = seedString(SUITE.masterSeeds[+seed], name, taskId, +a), d = draws(ss);
  const run = runAgent(SUITE, cfg, task, d, consts), pass = scoreAttempt(task, run);
  const cls = pass ? null : classifyFailure(cfg, task, run);
  return (
    <section id="explorer" className="card window reveal" data-title="attempt_explorer — live">
      <div className="head">
        <div>
          <p className="eyebrow">Trace any number to one attempt</p>
          <h2>Pick an attempt and watch the seeded draws decide it.</h2>
          <p className="sub">Each attempt seeds Python’s <code>random.Random</code> with the string below. The first draw decides whether the agent slips; the second, if the verifier is on, decides whether the slip is caught.</p>
        </div>
        {!REPO_NAMES.includes(name) || !isDefault ? <span className="pill warn">Off-record settings</span> : <span className="pill info">Recorded settings</span>}
      </div>
      <div className="controls">
        <Select label="Variant" value={name} onChange={setName} options={Object.keys(COMBOS).map((x) => [x, REPO_NAMES.includes(x) ? x : `${x} (off-record)`])} />
        <Select label="Master seed" value={seed} onChange={setSeed} options={seedOptions.slice(1)} />
        <Select label="Task" value={taskId} onChange={setTaskId} options={TASKS.map((t) => [t.id, `${t.id} · ${t.category} · difficulty ${t.difficulty}`])} />
        <Select label="Attempt" value={a} onChange={setA} options={Array.from({ length: SUITE.attempts }, (_, i) => [String(i), `Attempt ${i}`])} />
      </div>
      <p className="mono seedline">random.Random("{ss}")</p>
      <div className="tiles" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <div className="tile"><div className="num">{run.drawsUsed ? d[0].toFixed(4) : '—'}</div><div className="cap">{run.drawsUsed ? `slip draw vs ${run.slipRate.toFixed(2)} (${consts.slipPerDifficulty} × difficulty ${task.difficulty}): ${run.slip ? 'slips' : 'no slip'}` : 'no draw: the run failed before answering'}</div></div>
        <div className="tile"><div className="num">{run.drawsUsed === 2 ? d[1].toFixed(4) : '—'}</div><div className="cap">{run.drawsUsed === 2 ? `catch draw vs ${consts.catchProb}: ${run.slip_caught ? 'caught, answer restored' : 'missed'}` : run.slip ? 'no verifier: the slip goes through' : 'catch draw not used'}</div></div>
        <div className="tile"><div className="num" style={{ color: pass ? 'var(--good)' : 'var(--bad)' }}>{pass ? 'pass' : 'fail'}</div><div className="cap">{pass ? 'scored as passing' : `class: ${cls}`}</div></div>
      </div>
      <p className="hint" style={{ marginTop: 14, marginBottom: 8 }}>
        Expected {task.expected_outcome === 'success' ? `answer ${show(task.expected_answer)}` : `failure ${task.expected_failure_label}`}; agent {run.outcome === 'success' ? `answered ${show(run.answer)}` : `failed with ${run.failure_label}`} in {run.steps} step{run.steps === 1 ? '' : 's'} for {run.cost_units} cost units.
        {!cfg.planner && task.plan.length > 1 ? ` The planner is off, so only step 1 of ${task.plan.length} ran.` : ''}
      </p>
      <Trajectory rows={run.trajectory} />
    </section>
  );
}

function Hygiene() {
  const h = deep.hygiene, [pd, ph] = h.max_cross_set_pair;
  const A = TASKS.find((t) => t.id === pd), B = TASKS.find((t) => t.id === ph), ta = fingerprintTokens(A), tb = fingerprintTokens(B);
  const inter = [...ta].filter((x) => tb.has(x)).length, uni = new Set([...ta, ...tb]).size;
  const rows = [
    [`Cross-set pairs compared (${IDS.dev.length} × ${IDS.heldout.length})`, h.cross_set_pairs_compared, null],
    ['Task id overlap', h.id_overlap_count, h.id_overlap_count === 0],
    ['Exact fingerprint overlaps', h.exact_fingerprint_overlap_count, h.exact_fingerprint_overlap_count === 0],
    ['Exact plan overlaps', h.exact_plan_overlap_count, h.exact_plan_overlap_count === 0],
    ['Near duplicates, Jaccard ≥ 0.9', h.near_duplicate_pairs_at_or_above_0_9, h.near_duplicate_pairs_at_or_above_0_9 === 0],
    ['Near neighbours, Jaccard ≥ 0.8 (disclosed)', `${h.near_neighbour_pairs_at_or_above_0_8} (${pd} / ${ph} at ${h.max_cross_set_jaccard})`, null],
    [`Duplicate full texts among ${h.all_task_texts} tasks`, h.all_duplicate_full_texts, h.all_duplicate_full_texts === 0],
    ['Cross-set duplicates ignoring id', h.cross_set_duplicates_ignoring_id, h.cross_set_duplicates_ignoring_id === 0],
    ['Scoring fields named in the agent class', h.agent_segment_banned_string_total, h.agent_segment_banned_string_total === 0],
    ['Held-out task ids in the agent class', h.agent_segment_heldout_id_total, h.agent_segment_heldout_id_total === 0],
    ['Runs unchanged when scoring keys are mutated', `${h.behavioural_mutation_runs_unchanged} of ${h.behavioural_mutation_tasks_checked}`, h.behavioural_mutation_runs_unchanged === h.behavioural_mutation_tasks_checked],
    ['Held-out file sha256 matches the Build record', h.heldout_file_sha256.slice(0, 12) + '…', h.heldout_hash_matches_build_record],
    ['Dev file sha256 matches the Build record', h.dev_file_sha256.slice(0, 12) + '…', h.dev_hash_matches_build_record],
    ['Shared expected-answer values (informational)', `${h.shared_distinct_expected_answer_values} (${h.shared_expected_answer_values.join(', ')})`, null],
  ];
  const fields = [['category', (t) => t.category], ['difficulty', (t) => t.difficulty], ['expected outcome', (t) => t.expected_outcome], ['failure label', (t) => t.expected_failure_label], ...A.plan.map((_, i) => [`step ${i + 1}`, (t) => (t.plan[i] ? `${t.plan[i].tool}(${t.plan[i].args.map((x) => JSON.stringify(x)).join(', ')})` : '—')])];
  return (
    <section id="hygiene" className="card window reveal" data-title="hygiene_report.txt">
      <p className="eyebrow">Contamination hygiene · results_deep.json</p>
      <h2>No exact leakage inside the repo, and one near neighbour, disclosed.</h2>
      <p className="sub">These checks prove the held-out set did not leak into the dev set or the agent code inside this repo. They cannot show independence from outside data: both sets have the same author, and no external corpus was checked.</p>
      <ul className="checks">
        {rows.map(([k, v, ok]) => (
          <li key={k}><span className={`pill ${ok === null ? 'warn' : ok ? 'good' : 'bad'}`}>{ok === null ? 'note' : ok ? 'pass' : 'fail'}</span><span>{k}</span><b className="mono">{String(v)}</b></li>
        ))}
      </ul>
      <h3 style={{ marginTop: 20 }}>{pd} vs {ph}: the same template with a different numerator</h3>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Field</th><th>{pd} (dev)</th><th>{ph} (held-out)</th></tr></thead>
          <tbody>
            {fields.map(([k, f]) => { const x = String(f(A)), y = String(f(B)); return <tr key={k}><td>{k}</td><td className={`mono ${x !== y ? 'diffcell' : ''}`}>{x}</td><td className={`mono ${x !== y ? 'diffcell' : ''}`}>{y}</td></tr>; })}
          </tbody>
        </table>
      </div>
      <SensChart />
      <p className="hint">Fingerprint tokens (category, outcome, answer, label, tools, args) recomputed live: {inter} shared of {uni} total, Jaccard = {inter}/{uni} = {jaccard(ta, tb)}, equal to the recorded {h.max_cross_set_jaccard}. Difficulty is not part of the fingerprint.</p>
    </section>
  );
}

const ZERO_CLASSES = TAXONOMY.filter((k) => deep.taxonomy.taxonomy_counts[k] === 0 && k !== 'other_wrong_answer').length;
function SensChart() {
  const ts = sens.thresholds, c = ts.map((t) => sens.pairs_at_or_above[t.toFixed(2)]), max = Math.max(...c);
  const W = 960, H = 220, pad = { l: 40, r: 10, t: 16, b: 34 }, bw = (W - pad.l - pad.r) / ts.length;
  const y = (v) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  return (
    <>
      <h3 style={{ marginTop: 20 }}>Threshold sweep: flagged pairs out of {sens.pairs_compared} (added in this change)</h3>
      <p className="hint" style={{ marginTop: 4 }}>From <a href={blob('level-3-deep/results_hygiene_sensitivity.json')}>results_hygiene_sensitivity.json</a>, written by hygiene_sensitivity.py with the same tokens and Jaccard. The report’s cut-offs are marked; the count is zero from {ts.find((t, i) => c[i] === 0).toFixed(2)} upward.</p>
      <div className="wide" style={{ overflowX: 'auto' }}>
        <svg className="chart" style={{ minWidth: 620 }} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Number of cross-set pairs at or above each Jaccard threshold">
          <line className="axis" x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} />
          {ts.map((t, i) => {
            const mark = t.toFixed(2) === '0.80' || t.toFixed(2) === '0.90';
            return (
              <g key={t} transform={`translate(${pad.l + i * bw} 0)`}>
                <rect x={4} y={y(c[i])} width={bw - 8} height={y(0) - y(c[i])} rx={4} fill={mark ? 'var(--warn)' : 'var(--primary)'} opacity={mark ? 1 : 0.7} />
                <text x={bw / 2} y={y(c[i]) - 5} textAnchor="middle" style={{ fill: 'var(--text)' }}>{c[i]}</text>
                <text x={bw / 2} y={H - 14} textAnchor="middle">≥{t.toFixed(2)}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </>
  );
}

const GAPS = [
  ['Validity', 'The agent under test is a rule-following toy, not an LLM. The numbers describe three switches and a seeded noise model, so they cannot support claims about real agents.'],
  ['Effects fixed by construction', 'truncated_plan and tool_misuse counts follow from task structure, and the verifier gap follows from the two invented constants. The what-if sliders above make this visible.'],
  ['Uncertainty', `The repo reports only population variance over ${SUITE.masterSeeds.length} seeds, rounded to 4 places (many cells read 0.0). No intervals over tasks and no paired tests. This page adds a bootstrap over tasks and a paired bootstrap against the full variant, labelled as added.`],
  ['pass@k estimator', 'The repo uses “any of the first k attempts”, not the unbiased estimator of Chen et al. (2021). Both are shown side by side above.'],
  ['Held-out independence', 'Same author, same repo, one reused template (the near-neighbour pair). Hygiene proves no exact leakage only. The near-duplicate threshold was a single fixed value; a threshold sweep is now committed and shown above.'],
  ['Taxonomy', `${ZERO_CLASSES} of ${TAXONOMY.length} classes (loop_trap, excess_steps) are unreachable by construction; tool_misuse has one mechanism; no human adjudication sample or agreement rate.`],
  ['Related work', 'NOVELTY.md is a draft with no measurement and SPEC.md has no citations. Real-agent benchmarks such as SWE-bench (Jimenez et al., 2024), AgentBench (Liu et al., 2024), τ-bench (Yao et al., 2024) and Terminal-Bench (2025) are the comparison class; no measured difference against them is claimed.'],
  ['Cost and environment', 'Cost is abstract units on an invented price list. Runs used the Muse VM, not the assigned fleet node (self-deducted).'],
];

function Limits() {
  return (
    <section id="limits" className="card window reveal" data-title="ROADMAP.md — limits and grades">
      <p className="eyebrow">Threats to validity</p>
      <h2>What this evidence can and cannot carry.</h2>
      <p className="sub">The grades are <b>self-assigned in the repo’s level READMEs</b>, not an external evaluation. Deductions are quoted from those files; the review gaps are from this site’s <a href={blob('docs/research-review.md')}>research review</a>.</p>
      <div className="tiles" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        {GRADES.map((g) => (
          <div className="tile" key={g.level}>
            <div className="num">{fmt(g.grade)}</div><div className="cap">{g.level}, of {fmt(g.of)} · self-graded in the repo</div>
            <details><summary>{g.deductions.length} deductions, minus {fmt(g.of - g.grade)}</summary>
              <ul className="deds">{g.deductions.map((d) => <li key={d.text}>{d.text} <b>−{fmt(d.minus)}</b></li>)}</ul>
            </details>
          </div>
        ))}
      </div>
      <div className="grid2" style={{ marginTop: 18 }}>
        <div>
          <h3>Gaps found in this review</h3>
          <ul className="gaps">{GAPS.map(([k, v]) => <li key={k}><b>{k}.</b> {v}</li>)}</ul>
        </div>
        <div>
          <h3>v1.1 backlog (from ROADMAP.md, not done)</h3>
          <ul className="gaps">{BACKLOG.map((b) => <li key={b.title}><b>{b.title}.</b> {b.body}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}

function Reproduce() {
  const docs = [
    ['SPEC.md', 'Spec', 'Scope and acceptance'], ['level-2-build/eval_suite.py', 'eval_suite.py', 'Harness, agent, pass@k'], ['level-3-deep/deep_analysis.py', 'deep_analysis.py', 'Taxonomy and hygiene'],
    ['site/src/engine.js', 'engine.js', 'The JavaScript port'], ['site/src/engine.check.mjs', 'engine.check.mjs', 'Known-answer check'], ['docs/research-review.md', 'Research review', 'Rubric grades and fixes'],
  ];
  return (
    <section id="reproduce" className="card window reveal" data-title="Terminal — python level-N/run_*.py">
      <p className="eyebrow">Reproduce it</p>
      <h2>Three runners, deterministic to the byte.</h2>
      <ol className="steps" style={{ marginTop: 16 }}>
        {GRADES.map((g, i) => (
          <li key={g.level}><span className="n">{i + 1}</span><div><b>{g.level}</b><div className="hint"><code>python {g.path.replace('README.md', ['run_learn.py', 'run_build.py', 'run_deep.py'][i])}</code></div>
            <div className="hint">Recorded output sha256, from {g.path}: <span className="mono hash">{g.sha}</span></div></div></li>
        ))}
        <li><span className="n">4</span><div><b>Unit tests</b><div className="hint"><code>python tests/test_smoke.py && python -m unittest discover -s tests -v</code></div></div></li>
        <li><span className="n">5</span><div><b>Second-language replay</b><div className="hint"><code>cd site && npm ci && npm run build</code></div><div className="hint">Runs engine.check.mjs first: the build fails if the JavaScript port disagrees with any recorded number.</div></div></li>
      </ol>
      <div className="docs" style={{ marginTop: 20 }}>
        {docs.map(([p, t, d]) => <a key={p} href={blob(p)}><b>{t}</b><small>{d}</small></a>)}
      </div>
    </section>
  );
}
