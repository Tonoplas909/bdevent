// Turns design-system/tokens.json (MIAGE Étendu) into CSS custom properties.
// Light (first theme) values go in :root; the other themes only override what differs.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// '{other-token}' is an alias of another token.
const css = (v) => (typeof v === 'string' ? v.replace(/^\{([A-Za-z0-9_.-]+)\}$/, 'var(--$1)') : v);

const valueFor = (token, themeId, firstId) =>
  css(typeof token.value === 'string' ? (themeId === firstId ? token.value : undefined) : token.value[themeId]);

export function tokensToCss(tokens) {
  const themes = tokens.color?.themes ?? [{ id: 'light' }];
  const first = themes[0].id;
  const root = [];
  for (const t of tokens.color?.tokens ?? []) root.push(`  --${t.name}: ${valueFor(t, first, first)};`);
  const families = tokens.type?.families ?? {};
  for (const [name, stack] of Object.entries(families)) root.push(`  --font-${name}: ${stack};`);
  for (const family of ['spacing', 'radius', 'shadow']) {
    for (const t of tokens[family]?.tokens ?? []) root.push(`  --${t.name}: ${t.value};`);
  }

  const blocks = [`:root {\n${root.join('\n')}\n}`];
  for (const theme of themes.slice(1)) {
    const lines = [];
    for (const t of tokens.color?.tokens ?? []) {
      const v = valueFor(t, theme.id, first);
      if (v !== undefined && v !== valueFor(t, first, first)) lines.push(`  --${t.name}: ${v};`);
    }
    if (lines.length) blocks.push(`:root[data-theme="${theme.id}"] {\n${lines.join('\n')}\n}`);
  }
  return blocks.join('\n\n') + '\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const src = new URL('../design-system/tokens.json', import.meta.url);
  const out = new URL('../src/styles/tokens.css', import.meta.url);
  const css = tokensToCss(JSON.parse(readFileSync(src, 'utf8')));
  writeFileSync(out, `/* MIAGE Étendu — generated from design-system/tokens.json */\n${css}`);
  console.log('wrote src/styles/tokens.css');
}
