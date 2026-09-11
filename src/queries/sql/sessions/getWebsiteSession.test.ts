import { afterEach, expect, test, vi } from 'vitest';

async function loadModule({ mode }: { mode: 'prisma' | 'clickhouse' }) {
  vi.resetModules();

  const state = { mode };
  const prismaRawQuery = vi.fn().mockResolvedValue([{}]);
  const clickhouseRawQuery = vi.fn().mockResolvedValue([{}]);

  vi.doMock('@/lib/db', () => ({
    CLICKHOUSE: 'clickhouse',
    PRISMA: 'prisma',
    runQuery: vi.fn((queries: Record<string, () => unknown>) => queries[state.mode]()),
  }));

  vi.doMock('@/lib/prisma', () => ({
    default: {
      rawQuery: prismaRawQuery,
      getTimestampDiffSQL: vi.fn().mockReturnValue('timestamp_diff(min_time, max_time)'),
    },
  }));

  vi.doMock('@/lib/clickhouse', () => ({
    default: {
      rawQuery: clickhouseRawQuery,
      getDateStringSQL: vi.fn().mockImplementation((field: string) => field),
    },
  }));

  const mod = await import('./getWebsiteSession');

  return { getWebsiteSession: mod.getWebsiteSession, prismaRawQuery, clickhouseRawQuery };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

test('keeps custom events out of the PostgreSQL native visit duration', async () => {
  const { getWebsiteSession, prismaRawQuery } = await loadModule({ mode: 'prisma' });

  await getWebsiteSession('website-1', 'session-1');

  const [query] = prismaRawQuery.mock.calls[0];

  expect(query).toContain('event_type NOT IN (2, 5)');
  expect(query).toContain('coalesce(sum(timestamp_diff(min_time, max_time)), 0)');
});

test('keeps custom events out of the ClickHouse native visit duration', async () => {
  const { getWebsiteSession, clickhouseRawQuery } = await loadModule({ mode: 'clickhouse' });

  await getWebsiteSession('website-1', 'session-1');

  const [query] = clickhouseRawQuery.mock.calls[0];

  expect(query).toContain('minIf(min_time, event_type NOT IN (2, 5))');
  expect(query).toContain('ifNull(sum(max_time-min_time), 0)');
});
