// Known-answer check, run by `npm run build` before vite: the JS port must reproduce
// every recorded number in results_build.json and the results_deep.json taxonomy.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { sha512, pyRandom, parseSuite, runVariant, summarize, taxonomy, unbiasedFromSeedRows, bootstrapTasks, round4, pairedBootstrapDiff, fingerprintTokens, jaccard, handChecks } from './engine.js';
import { parseGrade, parseSha, parseBacklog } from './docs.js';

const root = new URL('../../', import.meta.url);
const read = (p) => fs.readFileSync(new URL(p, root), 'utf8');
const json = (p) => JSON.parse(read(p));
const suite = parseSuite(read('level-2-build/eval_suite.py'));
const build = json('level-2-build/results_build.json'), deep = json('level-3-deep/results_deep.json');
const dev = json('level-2-build/tasks_dev.json').map((t) => ({ ...t, set: 'dev' }));
const held = json('level-2-build/tasks_heldout.json').map((t) => ({ ...t, set: 'heldout' }));

// 1. SHA-512 against node's implementation, across block boundaries.
for (const s of ['', 'abc', '11:full:H01:0', 'x'.repeat(111), 'y'.repeat(112), 'z'.repeat(300)])
  assert.equal(Buffer.from(sha512(new TextEncoder().encode(s))).toString('hex'), createHash('sha512').update(s).digest('hex'), `sha512 ${s.length}`);

// 2. CPython random.Random('11:full:H01:0'): first two draws printed by CPython 3.12.
const r = pyRandom('11:full:H01:0');
assert.equal(r.random(), 0.145463714448532);
assert.equal(r.random(), 0.15470322963451677);

// 3. Parsed constants match the record.
assert.deepEqual(suite.masterSeeds, build.master_seeds);
assert.equal(suite.attempts, build.attempts_per_task);

// 4. Every cell of results_build.json (5 variants x 3 splits) and the ablation table.
const all = [...dev, ...held], ids = { dev: dev.map((t) => t.id), heldout: held.map((t) => t.id), all: all.map((t) => t.id) };
const byVariant = {};
let cells = 0;
for (const [name, cfg] of Object.entries(suite.variants)) {
  byVariant[name] = runVariant(suite, name, cfg, all);
  for (const split of ['dev', 'heldout', 'all']) {
    const { seedRows, ...got } = summarize(suite, byVariant[name], ids[split]);
    const want = build.variants[name][split];
    assert.deepEqual({ ...got, pass_at_k: Object.fromEntries(Object.entries(got.pass_at_k).map(([k, v]) => [String(k), v])) }, want, `${name}/${split}`);
    cells++;
    // Added estimators: unbiased pass@n equals first-n pass@n; unbiased pass@1 equals the attempt success rate.
    assert.equal(round4(unbiasedFromSeedRows(seedRows, suite.attempts)), want.pass_at_k[String(suite.attempts)], `unbiased pass@5 ${name}/${split}`);
    assert.equal(round4(unbiasedFromSeedRows(seedRows, 1)), want.mean_attempt_success_rate, `unbiased pass@1 ${name}/${split}`);
    const ci = bootstrapTasks(seedRows);
    assert.equal(round4(ci.point), want.mean_attempt_success_rate);
    assert.ok(ci.lo <= ci.point + 1e-12 && ci.point <= ci.hi + 1e-12, `bootstrap ${name}/${split}`);
  }
}
for (const row of build.ablation_table) {
  const a = build.variants[row.variant].all;
  assert.equal(row.mean_success, a.mean_attempt_success_rate); assert.equal(row.pass_at_1, a.pass_at_k['1']);
}

// Paired bootstrap vs full: the point estimate is the recorded difference in mean success.
for (const name of Object.keys(suite.variants)) for (const split of ['dev', 'heldout', 'all']) {
  const rows = (n) => summarize(suite, byVariant[n], ids[split]).seedRows;
  const p = pairedBootstrapDiff(rows('full'), rows(name));
  assert.ok(Math.abs(p.point - (build.variants.full[split].mean_attempt_success_rate - build.variants[name][split].mean_attempt_success_rate)) < 1e-4, `paired ${name}/${split}`);
  assert.ok(p.lo <= p.point + 1e-12 && p.point <= p.hi + 1e-12);
}

// 5. Deep taxonomy recount.
const tax = taxonomy(byVariant), t = deep.taxonomy;
assert.equal(tax.total, t.total_attempts); assert.equal(tax.failed, t.failed_attempts);
assert.deepEqual(tax.counts, t.taxonomy_counts);
assert.deepEqual(tax.byVariant, t.taxonomy_by_variant);
assert.deepEqual(tax.bySet, t.taxonomy_by_set);

// 6. Determinism sha256 values quoted in the level READMEs match the committed files.
for (const [readme, file] of [['level-1-learn/README.md', 'level-1-learn/results_learn.json'], ['level-2-build/README.md', 'level-2-build/results_build.json'], ['level-3-deep/README.md', 'level-3-deep/results_deep.json']]) {
  const h = createHash('sha256').update(fs.readFileSync(new URL(file, root))).digest('hex');
  assert.ok(read(readme).replace(/\s+/g, ' ').includes(h), `${file} sha256 not quoted in ${readme}`);
}
// 7. README hand checks and the disclosed D16/H20 near neighbour, recomputed.
const hc = handChecks(suite, all);
assert.equal(hc.truncated, t.taxonomy_counts.truncated_plan);
assert.equal(hc.toolMisuse, t.taxonomy_counts.tool_misuse);
assert.equal(Object.values(t.taxonomy_by_variant).reduce((s, v) => s + v.silent_wrong_answer, 0), t.taxonomy_counts.silent_wrong_answer);
const [pd, ph] = deep.hygiene.max_cross_set_pair;
assert.equal(jaccard(fingerprintTokens(all.find((x) => x.id === pd)), fingerprintTokens(all.find((x) => x.id === ph))), deep.hygiene.max_cross_set_jaccard);
assert.equal(dev.length * held.length, deep.hygiene.cross_set_pairs_compared);

// 8. Grades parsed from the level READMEs are internally consistent (deductions sum to the gap).
const grades = ['level-1-learn', 'level-2-build', 'level-3-deep'].map((l) => parseGrade(read(`${l}/README.md`)));
for (const g of grades) assert.equal(g.deductions.reduce((s, d) => s + d.minus, 0), g.of - g.grade);
assert.deepEqual(grades.map((g) => g.grade), [8700, 8200, 7750]);
assert.equal(parseSha(read('level-2-build/README.md')), createHash('sha256').update(fs.readFileSync(new URL('level-2-build/results_build.json', root))).digest('hex'));
assert.ok(parseBacklog(read('ROADMAP.md')).length >= 5);
console.log('engine ok', { cells, attempts: tax.total, failures: tax.failed, taxonomy: tax.counts });
