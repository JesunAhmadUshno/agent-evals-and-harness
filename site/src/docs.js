// Parses the self-assigned grades, deductions, determinism hashes and backlog out of the repo's
// own markdown at build time, so none of these numbers are retyped on the page.
const flat = (s) => s.replace(/\s+/g, ' ');
export function parseGrade(md) {
  const [, got, of] = md.match(/Grade: ([\d,]+) of ([\d,]+)/);
  const block = md.split(/Deductions[^\n]*\n/)[1].split(/\n\s*\n/)[0];
  const deductions = block.split(/\n- /).map((s) => flat(s.replace(/^- /, '')).trim()).filter(Boolean).map((s) => {
    const m = s.match(/^(.*):\s*minus ([\d,]+)\.?$/);
    return { text: m[1], minus: Number(m[2].replace(/,/g, '')) };
  });
  return { grade: Number(got.replace(/,/g, '')), of: Number(of.replace(/,/g, '')), deductions };
}
export const parseSha = (md) => flat(md).match(/sha256 ([0-9a-f]{64}) on both runs/)[1];
export function parseBacklog(md) {
  const sec = md.split('## v1.1 backlog')[1];
  return sec.split(/\n- /).slice(1).map((s) => { const t = flat(s).trim(); const i = t.indexOf(':'); return { title: t.slice(0, i), body: t.slice(i + 1).trim() }; });
}
