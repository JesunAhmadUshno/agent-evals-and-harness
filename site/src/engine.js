// In-browser replay of the Build harness (level-2-build/eval_suite.py) and the
// Deep classifier (level-3-deep/deep_analysis.py). Every constant comes from the
// Python source or the task files, parsed at build time; engine.check.mjs asserts
// that this port reproduces every recorded number in results_build.json and
// results_deep.json before the site is built.

// ---------- SHA-512 (sync, 32-bit halves). Constants are derived, not typed. ----------
const M64 = (1n << 64n) - 1n;
const iroot = (n, k) => { // floor(n^(1/k)) for BigInt n
  let x = 1n << BigInt(Math.ceil(n.toString(2).length / k) + 1);
  for (;;) { const y = ((BigInt(k) - 1n) * x + n / x ** BigInt(k - 1)) / BigInt(k); if (y >= x) break; x = y; }
  while (x ** BigInt(k) > n) x -= 1n;
  while ((x + 1n) ** BigInt(k) <= n) x += 1n;
  return x;
};
const primes = []; for (let p = 2; primes.length < 80; p++) if (primes.every((q) => p % q)) primes.push(p);
const split64 = (b) => [Number(b >> 32n), Number(b & 0xffffffffn)];
export const K = new Uint32Array(primes.flatMap((p) => split64(iroot(BigInt(p) << 192n, 3) & M64)));
export const H0 = new Uint32Array(primes.slice(0, 8).flatMap((p) => split64(iroot(BigInt(p) << 128n, 2) & M64)));

const rH = (h, l, n) => (n < 32 ? (h >>> n) | (l << (32 - n)) : (l >>> (n - 32)) | (h << (64 - n))) >>> 0;
const rL = (h, l, n) => (n < 32 ? (l >>> n) | (h << (32 - n)) : (h >>> (n - 32)) | (l << (64 - n))) >>> 0;
const sH = (h, l, n) => h >>> n;
const sL = (h, l, n) => ((l >>> n) | (h << (32 - n))) >>> 0;

export function sha512(bytes) {
  const len = bytes.length, total = Math.ceil((len + 17) / 128) * 128;
  const m = new Uint8Array(total); m.set(bytes); m[len] = 0x80;
  const dv = new DataView(m.buffer);
  dv.setUint32(total - 8, Math.floor((len * 8) / 2 ** 32)); dv.setUint32(total - 4, (len * 8) >>> 0);
  const h = H0.slice(), W = new Uint32Array(160);
  for (let off = 0; off < total; off += 128) {
    for (let t = 0; t < 32; t++) W[t] = dv.getUint32(off + 4 * t);
    for (let t = 16; t < 80; t++) {
      const ah = W[2 * t - 30], al = W[2 * t - 29], bh = W[2 * t - 4], bl = W[2 * t - 3];
      const s0h = rH(ah, al, 1) ^ rH(ah, al, 8) ^ sH(ah, al, 7), s0l = rL(ah, al, 1) ^ rL(ah, al, 8) ^ sL(ah, al, 7);
      const s1h = rH(bh, bl, 19) ^ rH(bh, bl, 61) ^ sH(bh, bl, 6), s1l = rL(bh, bl, 19) ^ rL(bh, bl, 61) ^ sL(bh, bl, 6);
      const lo = (s0l >>> 0) + (s1l >>> 0) + W[2 * t - 13] + W[2 * t - 31];
      W[2 * t] = (s0h >>> 0) + (s1h >>> 0) + W[2 * t - 14] + W[2 * t - 32] + Math.floor(lo / 2 ** 32);
      W[2 * t + 1] = lo;
    }
    let [ah, al, bh, bl, ch, cl, dh, dl, eh, el, fh, fl, gh, gl, hh, hl] = h;
    for (let t = 0; t < 80; t++) {
      const S1h = rH(eh, el, 14) ^ rH(eh, el, 18) ^ rH(eh, el, 41), S1l = rL(eh, el, 14) ^ rL(eh, el, 18) ^ rL(eh, el, 41);
      const chh = (eh & fh) ^ (~eh & gh), chl = (el & fl) ^ (~el & gl);
      const t1l = hl + (S1l >>> 0) + (chl >>> 0) + K[2 * t + 1] + W[2 * t + 1];
      const t1h = hh + (S1h >>> 0) + (chh >>> 0) + K[2 * t] + W[2 * t] + Math.floor(t1l / 2 ** 32);
      const S0h = rH(ah, al, 28) ^ rH(ah, al, 34) ^ rH(ah, al, 39), S0l = rL(ah, al, 28) ^ rL(ah, al, 34) ^ rL(ah, al, 39);
      const mjh = (ah & bh) ^ (ah & ch) ^ (bh & ch), mjl = (al & bl) ^ (al & cl) ^ (bl & cl);
      const t2l = (S0l >>> 0) + (mjl >>> 0), t2h = (S0h >>> 0) + (mjh >>> 0) + Math.floor(t2l / 2 ** 32);
      hh = gh; hl = gl; gh = fh; gl = fl; fh = eh; fl = el;
      const el2 = dl + (t1l >>> 0); eh = (dh + t1h + Math.floor(el2 / 2 ** 32)) >>> 0; el = el2 >>> 0;
      dh = ch; dl = cl; ch = bh; cl = bl; bh = ah; bl = al;
      const al2 = (t1l >>> 0) + (t2l >>> 0); ah = (t1h + t2h + Math.floor(al2 / 2 ** 32)) >>> 0; al = al2 >>> 0;
    }
    [ah, al, bh, bl, ch, cl, dh, dl, eh, el, fh, fl, gh, gl, hh, hl].forEach((v, i) => {
      if (i % 2) { const s = h[i] + v; h[i] = s; h[i - 1] = h[i - 1] + Math.floor(s / 2 ** 32); } else h[i] = h[i] + v;
    });
  }
  const out = new Uint8Array(64), odv = new DataView(out.buffer);
  for (let i = 0; i < 16; i++) odv.setUint32(4 * i, h[i]);
  return out;
}

// ---------- CPython random.Random(str): seed version 2 -> MT19937 init_by_array ----------
export function pyRandom(seedStr) {
  const enc = new TextEncoder().encode(seedStr);
  const bytes = new Uint8Array(enc.length + 64); bytes.set(enc); bytes.set(sha512(enc), enc.length);
  // int.from_bytes(bytes, 'big') split into 32-bit words, least significant first
  const pad = (4 - (bytes.length % 4)) % 4, b = new Uint8Array(bytes.length + pad); b.set(bytes, pad);
  const key = []; for (let i = b.length - 4; i >= 0; i -= 4) key.push(((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0);
  while (key.length > 1 && key[key.length - 1] === 0) key.pop();
  const mt = new Uint32Array(624);
  mt[0] = 19650218;
  for (let i = 1; i < 624; i++) mt[i] = (Math.imul(1812433253, mt[i - 1] ^ (mt[i - 1] >>> 30)) + i) >>> 0;
  let i = 1, j = 0;
  for (let k = Math.max(624, key.length); k; k--) {
    const s = mt[i - 1] ^ (mt[i - 1] >>> 30);
    mt[i] = ((mt[i] ^ Math.imul(s, 1664525)) >>> 0) + key[j] + j >>> 0;
    i++; j++; if (i >= 624) { mt[0] = mt[623]; i = 1; } if (j >= key.length) j = 0;
  }
  for (let k = 623; k; k--) {
    const s = mt[i - 1] ^ (mt[i - 1] >>> 30);
    mt[i] = (((mt[i] ^ Math.imul(s, 1566083941)) >>> 0) - i) >>> 0;
    i++; if (i >= 624) { mt[0] = mt[623]; i = 1; }
  }
  mt[0] = 0x80000000;
  let mti = 624;
  const next = () => {
    if (mti >= 624) {
      for (let kk = 0; kk < 624; kk++) {
        const y = (mt[kk] & 0x80000000) | (mt[(kk + 1) % 624] & 0x7fffffff);
        mt[kk] = mt[(kk + 397) % 624] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      }
      mti = 0;
    }
    let y = mt[mti++];
    y ^= y >>> 11; y ^= (y << 7) & 0x9d2c5680; y ^= (y << 15) & 0xefc60000; y ^= y >>> 18;
    return y >>> 0;
  };
  return { random: () => ((next() >>> 5) * 67108864 + (next() >>> 6)) / 9007199254740992 };
}

// ---------- Python numeric helpers ----------
// round(x, 4): exact-value rounding; ties cannot occur for these binary values.
export const round4 = (x) => Number(x.toFixed(4));
// CPython 3.12 sum() over floats uses Neumaier compensated summation.
export function pySum(xs) {
  let f = 0, c = 0;
  for (const x of xs) { const t = f + x; c += Math.abs(f) >= Math.abs(x) ? (f - t) + x : (x - t) + f; f = t; }
  return c && Number.isFinite(c) ? f + c : f;
}

// ---------- parse eval_suite.py constants (no hand-typed numbers) ----------
export function parseSuite(src) {
  const num = (name) => Number(src.match(new RegExp(`^${name} = ([0-9.]+)`, 'm'))[1]);
  const block = (name) => src.match(new RegExp(`^${name} = \\{([\\s\\S]*?)\\n\\}`, 'm'))[1];
  const kb = {};
  for (const [, k, v] of block('KNOWLEDGE_BASE').matchAll(/"([^"]+)":\s*("[^"]*"|-?\d+)/g)) kb[k] = v.startsWith('"') ? v.slice(1, -1) : Number(v);
  const toolCosts = {};
  for (const [, k, v] of src.match(/^TOOL_COSTS = \{(.*)\}/m)[1].matchAll(/"(\w+)": (\d+)/g)) toolCosts[k] = Number(v);
  const variants = {};
  for (const [, name, p, m, v] of block('VARIANTS').matchAll(/"(\w+)": \{"planner": (True|False), "memory": (True|False), "verifier": (True|False)\}/g))
    variants[name] = { planner: p === 'True', memory: m === 'True', verifier: v === 'True' };
  return {
    kb, toolCosts, variants,
    verifierCost: num('VERIFIER_COST'), catchProb: num('VERIFIER_CATCH_PROB'), slipPerDifficulty: num('SLIP_PER_DIFFICULTY'),
    masterSeeds: src.match(/^MASTER_SEEDS = \[(.*)\]/m)[1].split(',').map(Number),
    attempts: num('ATTEMPTS_PER_TASK'), passKs: src.match(/^PASS_KS = \((.*)\)/m)[1].split(',').filter((s) => s.trim()).map(Number),
  };
}

// ---------- ConfigurableToyAgent.run, with the two rng draws exposed ----------
class ToolFailure { constructor(label, message) { this.label = label; this.message = message; } }

export function runAgent(suite, config, task, draws, consts = suite) {
  const tools = {
    add: (a, b) => a + b, multiply: (a, b) => a * b,
    divide: (a, b) => { if (b === 0) throw new ToolFailure('division_by_zero', 'division by zero'); return a / b; },
    lookup: (k) => { if (!(k in suite.kb)) throw new ToolFailure('missing_knowledge', `lookup miss: no entry for '${k}'`); return suite.kb[k]; },
  };
  const C = suite.toolCosts, trajectory = [], history = [], cache = new Map(), store = new Map();
  let steps = 0, cost = 0, plan = task.plan;
  if (!config.planner && plan.length > 1) plan = plan.slice(0, 1);
  const fail = (i, tool, args, f, c) => {
    cost += c;
    trajectory.push({ step: i + 1, tool, args, result: null, error: f.message, failure_label: f.label, cost_units: c });
    return { answer: null, outcome: 'failure', failure_label: f.label, steps, cost_units: cost, trajectory, slip: false, slip_caught: false, drawsUsed: 0 };
  };
  for (let i = 0; i < plan.length; i++) {
    const { tool } = plan[i], args = [];
    let failed = null;
    for (const arg of plan[i].args) {
      if (arg === '@prev') { if (!history.length) { failed = new ToolFailure('no_previous_result', '@prev before any result'); break; } args.push(history[history.length - 1]); }
      else if (typeof arg === 'string' && arg.startsWith('@step')) { const idx = parseInt(arg.slice(5), 10); if (idx < 0 || idx >= history.length) { failed = new ToolFailure('no_previous_result', 'placeholder out of range'); break; } args.push(history[idx]); }
      else if (typeof arg === 'string' && arg.startsWith('@recall:')) { const key = arg.slice(8); if (!config.memory || !store.has(key)) { failed = new ToolFailure('memory_unavailable', `recall unavailable for '${key}'`); break; } args.push(store.get(key)); }
      else args.push(arg);
    }
    steps += 1;
    if (failed) return fail(i, tool, args, failed, C[tool]);
    let result, stepCost;
    if (tool === 'lookup' && config.memory && cache.has(args[0])) { result = cache.get(args[0]); stepCost = 0; }
    else {
      stepCost = C[tool];
      try { result = tools[tool](...args); } catch (e) { if (e instanceof ToolFailure) return fail(i, tool, args, e, stepCost); throw e; }
      if (tool === 'lookup') { if (config.memory) cache.set(args[0], result); store.set(args[0], result); }
    }
    cost += stepCost; history.push(result);
    trajectory.push({ step: i + 1, tool, args, result, error: null, failure_label: null, cost_units: stepCost });
  }
  let answer = history.length ? history[history.length - 1] : null, slip = false, slipCaught = false, drawsUsed = 0;
  const rate = consts.slipPerDifficulty * parseInt(task.difficulty ?? 1, 10);
  if (answer !== null) {
    drawsUsed = 1;
    if (draws[0] < rate) {
      slip = true; const original = answer;
      answer = typeof answer === 'number' ? answer + 1 : typeof answer === 'string' ? `${answer} (uncertain)` : answer;
      if (config.verifier) {
        drawsUsed = 2;
        if (draws[1] < consts.catchProb) {
          slipCaught = true; answer = original; steps += 1; cost += suite.verifierCost;
          trajectory.push({ step: steps, tool: 'verifier', args: [], result: original, error: null, failure_label: null, cost_units: suite.verifierCost });
        }
      }
    }
  }
  return { answer, outcome: 'success', failure_label: null, steps, cost_units: cost, trajectory, slip, slip_caught: slipCaught, drawsUsed, slipRate: rate };
}

export const scoreAttempt = (task, run) => task.expected_outcome === 'success'
  ? run.outcome === 'success' && run.answer === task.expected_answer
  : run.outcome === 'failure' && run.failure_label === task.expected_failure_label;

export const TAXONOMY = ['loop_trap', 'excess_steps', 'truncated_plan', 'tool_misuse', 'silent_wrong_answer', 'other_wrong_answer'];
export function classifyFailure(config, task, run) {
  const counts = {};
  for (const e of run.trajectory) if (e.tool !== 'verifier') { const k = e.tool + JSON.stringify(e.args); counts[k] = (counts[k] || 0) + 1; }
  if (Math.max(0, ...Object.values(counts)) >= 3) return 'loop_trap';
  if (run.steps > task.plan.length + 1) return 'excess_steps';
  if (!config.planner && task.plan.length > 1) return 'truncated_plan';
  if (run.outcome === 'failure' && run.failure_label) return 'tool_misuse';
  if (run.outcome === 'success' && run.slip && !run.slip_caught) return 'silent_wrong_answer';
  return 'other_wrong_answer';
}

// ---------- the attempt stream ----------
export const OFF_RECORD = { planner_only: { planner: true, memory: false, verifier: false }, memory_only: { planner: false, memory: true, verifier: false }, verifier_only: { planner: false, memory: false, verifier: true } };
const drawCache = new Map();
export function draws(seedStr) {
  let d = drawCache.get(seedStr);
  if (!d) { const r = pyRandom(seedStr); d = [r.random(), r.random()]; drawCache.set(seedStr, d); }
  return d;
}
export const seedString = (master, variant, taskId, a) => `${master}:${variant}:${taskId}:${a}`;

// Runs one variant over every seed, task and attempt. tasks: [{...task, set}]
export function runVariant(suite, name, config, tasks, consts = suite) {
  const out = [];
  for (const master of suite.masterSeeds) for (const task of tasks) for (let a = 0; a < suite.attempts; a++) {
    const run = runAgent(suite, config, task, draws(seedString(master, name, task.id, a)), consts);
    const pass = scoreAttempt(task, run);
    out.push({ master, taskId: task.id, set: task.set, a, pass, steps: run.steps, cost: run.cost_units, cls: pass ? null : classifyFailure(config, task, run) });
  }
  return out;
}

// run_suite + run_harness aggregation, in the same arithmetic order as Python.
export function summarize(suite, attempts, taskIds) {
  const ids = new Set(taskIds), seedRows = [];
  for (const master of suite.masterSeeds) {
    const rows = attempts.filter((r) => r.master === master && ids.has(r.taskId));
    const byTask = new Map(); let steps = 0, cost = 0;
    for (const r of rows) { if (!byTask.has(r.taskId)) byTask.set(r.taskId, []); byTask.get(r.taskId).push(r.pass); steps += r.steps; cost += r.cost; }
    const matrix = [...byTask.values()], n = rows.length;
    const passK = {}; for (const k of suite.passKs) passK[k] = round4(matrix.filter((row) => row.slice(0, k).some(Boolean)).length / matrix.length);
    seedRows.push({ matrix, rate: round4(matrix.reduce((s, row) => s + row.filter(Boolean).length, 0) / n), passK, steps: round4(steps / n), cost: round4(cost / n) });
  }
  const rates = seedRows.map((r) => r.rate), mean = pySum(rates) / rates.length, v = pySum(rates.map((x) => (x - mean) ** 2)) / rates.length;
  const passK = {}; for (const k of suite.passKs) passK[k] = round4(pySum(seedRows.map((r) => r.passK[k])) / seedRows.length);
  return {
    tasks: ids.size, mean_attempt_success_rate: round4(mean), variance_attempt_success_rate: round4(v), std_attempt_success_rate: round4(v ** 0.5),
    pass_at_k: passK, mean_steps: round4(pySum(seedRows.map((r) => r.steps)) / seedRows.length), mean_cost_units: round4(pySum(seedRows.map((r) => r.cost)) / seedRows.length),
    per_seed_success_rates: rates, seedRows,
  };
}

export function taxonomy(attemptsByVariant) {
  const zero = () => Object.fromEntries(TAXONOMY.map((c) => [c, 0]));
  const res = { counts: zero(), byVariant: {}, bySet: { dev: zero(), heldout: zero() }, failed: 0, total: 0 };
  for (const [name, rows] of Object.entries(attemptsByVariant)) {
    res.byVariant[name] = zero();
    for (const r of rows) { res.total++; if (r.cls) { res.failed++; res.counts[r.cls]++; res.byVariant[name][r.cls]++; res.bySet[r.set][r.cls]++; } }
  }
  return res;
}

// ---------- added estimators (not in the repo's Python record) ----------
const comb = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
// Chen et al. (2021) unbiased pass@k from n attempts with c passes.
export const unbiasedPassK = (n, c, k) => (n - c < k ? 1 : 1 - comb(n - c, k) / comb(n, k));
// Mean over seeds of the per-seed mean over tasks.
export const unbiasedFromSeedRows = (seedRows, k) => seedRows.reduce((s, sr) => s + sr.matrix.reduce((t, row) => t + unbiasedPassK(row.length, row.filter(Boolean).length, k), 0) / sr.matrix.length, 0) / seedRows.length;

// Percentile bootstrap over tasks of the mean attempt success rate, seeded mulberry32.
export const BOOT_B = 2000;
export function bootstrapTasks(seedRows, B = BOOT_B, seed = 2026) {
  const nTasks = seedRows[0].matrix.length;
  const perTask = Array.from({ length: nTasks }, (_, t) => seedRows.reduce((s, sr) => s + sr.matrix[t].filter(Boolean).length / sr.matrix[t].length, 0) / seedRows.length);
  let st = seed >>> 0;
  const rnd = () => { st = (st + 0x6d2b79f5) >>> 0; let x = st; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const stats = [];
  for (let b = 0; b < B; b++) { let s = 0; for (let i = 0; i < nTasks; i++) s += perTask[Math.floor(rnd() * nTasks)]; stats.push(s / nTasks); }
  stats.sort((x, y) => x - y);
  return { point: perTask.reduce((a, b) => a + b, 0) / nTasks, lo: stats[Math.floor(0.025 * B)], hi: stats[Math.ceil(0.975 * B) - 1] };
}

// ---------- deep_analysis.py helpers ported for the page ----------
// _fingerprint_tokens + _jaccard (integer-valued tokens only; floats print differently in JS).
export function fingerprintTokens(task) {
  const t = new Set([`category|${task.category}`, `outcome|${task.expected_outcome}`, `answer|${JSON.stringify(task.expected_answer ?? null)}`, `failure_label|${task.expected_failure_label ?? 'None'}`]);
  for (const s of task.plan) { t.add(`tool|${s.tool}`); for (const a of s.args) t.add(`arg|${JSON.stringify(a)}`); }
  return t;
}
export const jaccard = (a, b) => { const u = new Set([...a, ...b]); return u.size ? [...a].filter((x) => b.has(x)).length / u.size : 1; };

// The README hand checks, recomputed from the task files and the variant table.
export function handChecks(suite, tasks) {
  const multi = tasks.filter((t) => t.plan.length > 1), recall = tasks.filter((t) => t.plan.some((s) => s.args.some((a) => typeof a === 'string' && a.startsWith('@recall:'))));
  const plannerOff = Object.entries(suite.variants).filter(([, c]) => !c.planner).map(([n]) => n);
  const memOnlyOff = Object.entries(suite.variants).filter(([, c]) => c.planner && !c.memory).map(([n]) => n);
  const perTaskPerVariant = suite.masterSeeds.length * suite.attempts;
  return {
    multi: multi.length, multiDev: multi.filter((t) => t.set === 'dev').length, multiHeld: multi.filter((t) => t.set === 'heldout').length,
    plannerOff, perTaskPerVariant, truncated: multi.length * plannerOff.length * perTaskPerVariant,
    recall: recall.map((t) => t.id), memOnlyOff, toolMisuse: recall.length * memOnlyOff.length * perTaskPerVariant,
  };
}
