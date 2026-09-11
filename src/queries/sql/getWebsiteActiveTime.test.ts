import { afterEach, describe, expect, test, vi } from 'vitest';

const parseFiltersResult = {
  queryParams: { websiteId: 'website-1' },
  filterQuery: 'and website_event.url_path = {{path}}',
  joinSessionQuery: 'join session on session.session_id = website_event.session_id',
  cohortQuery: 'join cohort on cohort.session_id = website_event.session_id',
  excludeBounceQuery: 'join excludeBounce on excludeBounce.visit_id = website_event.visit_id',
};

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
    default: {
      rawQuery: prismaRawQuery,
      parseFilters: vi.fn().mockReturnValue(parseFiltersResult),
    },
  }));

  vi.doMock('@/lib/clickhouse', () => ({
    default: {
      rawQuery: clickhouseRawQuery,
      parseFilters: vi.fn().mockReturnValue(parseFiltersResult),
    },
  }));

  const mod = await import('./getWebsiteActiveTime');

  return { getWebsiteActiveTime: mod.getWebsiteActiveTime, prismaRawQuery, clickhouseRawQuery };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('getWebsiteActiveTime', () => {
  test('aggregates numeric active-time events per visit in PostgreSQL', async () => {
    const { getWebsiteActiveTime, prismaRawQuery } = await loadModule({ mode: 'prisma' });

    await getWebsiteActiveTime('website-1', {});

    const [query, params] = prismaRawQuery.mock.calls[0];

    expect(query).toContain('count(distinct website_event.visit_id) as "visits"');
    expect(query).toContain('website_event.event_name = {{eventName}}');
    expect(query).toContain('event_data.data_key = {{propertyName}}');
    expect(query).toContain(parseFiltersResult.excludeBounceQuery);
    expect(params).toMatchObject({ eventName: 'active-time', propertyName: 'seconds' });
  });

  test('aggregates numeric active-time events per visit in ClickHouse', async () => {
    const { getWebsiteActiveTime, clickhouseRawQuery } = await loadModule({ mode: 'clickhouse' });

    await getWebsiteActiveTime('website-1', {});

    const [query, params] = clickhouseRawQuery.mock.calls[0];

    expect(query).toContain('any inner join');
    expect(query).toContain('uniq(website_event.visit_id) as visits');
    expect(query).toContain('event_data.data_key = {propertyName:String}');
    expect(query).toContain(parseFiltersResult.excludeBounceQuery);
    expect(params).toMatchObject({ eventName: 'active-time', propertyName: 'seconds' });
  });
});
