// Parses the verdict, lifecycle, determinism hashes and backlog out of the repo's own
// markdown at build time, so none of these values are retyped on the page.
const flat = (s) => s.replace(/\s+/g, ' ');
// The text of one "## " section whose heading starts with `heading`, up to the next "## ".
export function section(md, heading) {
  const start = md.indexOf(`\n## ${heading}`);
  if (start < 0) throw new Error(`section not found: ${heading}`);
  const rest = md.slice(start + 1);
  const end = rest.indexOf('\n## ', 3);
  return end < 0 ? rest : rest.slice(0, end);
}
export const parseSha = (md) => flat(md).match(/sha256 ([0-9a-f]{64}) on both runs/)[1];
export const parseVerdict = (md) => md.match(/^\*\*Verdict\.\*\* ([^.]+)/m)[1];
export const parseStages = (md) => [...md.matchAll(/^- (\w+): ([A-Z]+)(?: (\d{4}-\d{2}-\d{2}))?$/gm)].map((m) => m.slice(1));
export function parseBacklog(md) {
  const sec = md.split('## v1.1 backlog')[1].split(/\n## /)[0];
  return sec.split(/\n- /).slice(1).map((s) => { const t = flat(s).trim(); const i = t.indexOf(':'); return { title: t.slice(0, i), body: t.slice(i + 1).trim() }; });
}
