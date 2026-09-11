import { afterEach, describe, expect, test, vi } from 'vitest';

async function loadModule({ mode }: { mode: 'prisma' | 'clickhouse' }) {
  vi.resetModules();

  const state = { mode };
  const prismaRawQuery = vi.fn().mockResolvedValue([{ total: 30, visits: 1, average: 30 }]);
  const clickhouseRawQuery = vi.fn().mockResolvedValue([{ total: 30, visits: 1, average: 30 }]);

  vi.doMock('@/lib/db', () => ({
    CLICKHOUSE: 'clickhouse',
    PRISMA: 'prisma',
    runQuery: vi.fn((queries: Record<string, () => unknown>) => queries[state.mode]()),
  }));

  vi.doMock('@/lib/prisma', () => ({
    default: { rawQuery: prismaRawQuery },
  }));

  vi.doMock('@/lib/clickhouse', () => ({
    default: { rawQuery: clickhouseRawQuery },
  }));

  const mod = await import('./getSessionActiveTime');

  return { getSessionActiveTime: mod.getSessionActiveTime, prismaRawQuery, clickhouseRawQuery };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('getSessionActiveTime', () => {
  test('uses the current session and active-time property in PostgreSQL', async () => {
    const { getSessionActiveTime, prismaRawQuery } = await loadModule({ mode: 'prisma' });

    await getSessionActiveTime('website-1', 'session-1');

    const [query, params] = prismaRawQuery.mock.calls[0];

    expect(query).toContain('website_event.session_id = {{sessionId::uuid}}');
    expect(query).toContain('count(distinct website_event.visit_id) as "visits"');
    expect(params).toMatchObject({
      websiteId: 'website-1',
      sessionId: 'session-1',
      eventName: 'active-time',
      propertyName: 'seconds',
    });
  });

  test('uses the current session and active-time property in ClickHouse', async () => {
    const { getSessionActiveTime, clickhouseRawQuery } = await loadModule({ mode: 'clickhouse' });

    await getSessionActiveTime('website-1', 'session-1');

    const [query, params] = clickhouseRawQuery.mock.calls[0];

    expect(query).toContain('session_id = {sessionId:UUID}');
    expect(query).toContain('event_data.data_key = {propertyName:String}');
    expect(params).toMatchObject({
      websiteId: 'website-1',
      sessionId: 'session-1',
      eventName: 'active-time',
      propertyName: 'seconds',
    });
  });
});
