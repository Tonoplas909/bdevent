import { parseRoute, href } from './route.js';

test('parseRoute', () => {
  expect(parseRoute('#/event/abc/progress')).toEqual({ name: 'progress', id: 'abc', query: {} });
  expect(parseRoute('#/event/abc')).toEqual({ name: 'event', id: 'abc', query: {} });
  expect(parseRoute('#/new')).toEqual({ name: 'new', query: {} });
  expect(parseRoute('#/admin?canva=ok')).toEqual({ name: 'admin', query: { canva: 'ok' } });
  expect(parseRoute('')).toEqual({ name: 'events', query: {} });
  expect(parseRoute('#/nimporte')).toEqual({ name: 'events', query: {} });
});

test('href', () => {
  expect(href('event', 'abc')).toBe('#/event/abc');
  expect(href('progress', 'abc')).toBe('#/event/abc/progress');
  expect(href('events')).toBe('#/');
  expect(href('new')).toBe('#/new');
  expect(href('admin')).toBe('#/admin');
});
