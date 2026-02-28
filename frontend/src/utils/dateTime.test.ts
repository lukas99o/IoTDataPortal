import { parseApiTimestamp } from './dateTime';

describe('parseApiTimestamp', () => {
  it('keeps UTC timestamps with Z unchanged', () => {
    const timestamp = '2026-02-28T12:00:00Z';

    expect(parseApiTimestamp(timestamp).toISOString()).toBe('2026-02-28T12:00:00.000Z');
  });

  it('keeps timestamps with timezone offset unchanged', () => {
    const timestamp = '2026-02-28T12:00:00+01:00';

    expect(parseApiTimestamp(timestamp).toISOString()).toBe('2026-02-28T11:00:00.000Z');
  });

  it('treats timestamps without timezone as UTC by appending Z', () => {
    const timestamp = '2026-02-28T12:00:00';

    expect(parseApiTimestamp(timestamp).toISOString()).toBe('2026-02-28T12:00:00.000Z');
  });
});
