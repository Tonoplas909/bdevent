import { tokensToCss } from './tokens-to-css.mjs';

const tokens = {
  color: { themes: [{ id: 'light' }, { id: 'dark' }], tokens: [
    { name: 'color-bg', value: { light: '#e8eef3', dark: '#0b1522' } },
    { name: 'color-ink', value: '#0e1a2b' },
  ] },
  type: { families: { heading: '"Barlow Condensed", system-ui, sans-serif', body: '"Figtree", system-ui, sans-serif' } },
  spacing: { tokens: [{ name: 'space-3', value: '13.2px' }] },
  radius: { tokens: [{ name: 'radius-pill', value: '999px' }] },
  shadow: { tokens: [{ name: 'shadow-sm', value: '0 1px 2px rgba(14, 26, 43, 0.14)' }] },
};

test('light values in :root, dark overrides only where they differ', () => {
  const css = tokensToCss(tokens);
  expect(css).toMatch(/:root\s*{[^}]*--color-bg: #e8eef3;/);
  expect(css).toMatch(/:root\s*{[^}]*--color-ink: #0e1a2b;/);
  expect(css).toMatch(/:root\[data-theme="dark"\]\s*{[^}]*--color-bg: #0b1522;/);
  expect(css).not.toMatch(/data-theme="dark"\]\s*{[^}]*--color-ink/);
});

test('an alias {other-token} becomes var(--other-token)', () => {
  const css = tokensToCss({ color: { themes: [{ id: 'light' }, { id: 'dark' }], tokens: [
    { name: 'color-neutral-700', value: '#4a5568' },
    { name: 'color-text-secondary', value: { light: '{color-neutral-700}', dark: '#a9b8c8' } },
  ] } });
  expect(css).toContain('--color-text-secondary: var(--color-neutral-700);');
  expect(css).toMatch(/data-theme="dark"\]\s*{[^}]*--color-text-secondary: #a9b8c8;/);
});

test('fonts, spacing, radius and shadow', () => {
  const css = tokensToCss(tokens);
  expect(css).toContain('--font-heading: "Barlow Condensed", system-ui, sans-serif;');
  expect(css).toContain('--font-body: "Figtree", system-ui, sans-serif;');
  expect(css).toContain('--space-3: 13.2px;');
  expect(css).toContain('--radius-pill: 999px;');
  expect(css).toContain('--shadow-sm: 0 1px 2px rgba(14, 26, 43, 0.14);');
});
