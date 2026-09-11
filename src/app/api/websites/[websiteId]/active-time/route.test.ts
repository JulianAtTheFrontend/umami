import { beforeEach, expect, test, vi } from 'vitest';
import { getCompareDate } from '@/lib/date';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { canViewWebsiteSection } from '@/permissions';
import { getWebsiteActiveTime } from '@/queries/sql/getWebsiteActiveTime';
import { GET } from './route';

vi.mock('@/lib/date', () => ({
  getCompareDate: vi.fn(),
}));

vi.mock('@/lib/request', () => ({
  getQueryFilters: vi.fn(),
  parseRequest: vi.fn(),
}));

vi.mock('@/permissions', () => ({
  canViewWebsiteSection: vi.fn(),
}));

vi.mock('@/queries/sql/getWebsiteActiveTime', () => ({
  getWebsiteActiveTime: vi.fn(),
}));

const getCompareDateMock = vi.mocked(getCompareDate);
const parseRequestMock = vi.mocked(parseRequest);
const getQueryFiltersMock = vi.mocked(getQueryFilters);
const canViewWebsiteSectionMock = vi.mocked(canViewWebsiteSection);
const getWebsiteActiveTimeMock = vi.mocked(getWebsiteActiveTime);

beforeEach(() => {
  getCompareDateMock.mockReset();
  parseRequestMock.mockReset();
  getQueryFiltersMock.mockReset();
  canViewWebsiteSectionMock.mockReset();
  getWebsiteActiveTimeMock.mockReset();
});

test('returns active time with a matching comparison range', async () => {
  const query = { startAt: 1786986000000, endAt: 1787075999999, compare: 'prev' };
  const filters = {
    startDate: new Date('2026-08-17T07:00:00.000Z'),
    endDate: new Date('2026-08-18T06:59:59.999Z'),
    compare: 'prev',
  };
  const comparisonStart = new Date('2026-08-16T07:00:00.000Z');
  const comparisonEnd = new Date('2026-08-17T06:59:59.999Z');

  parseRequestMock.mockResolvedValue({ auth: {}, query, error: undefined });
  canViewWebsiteSectionMock.mockResolvedValue(true);
  getQueryFiltersMock.mockResolvedValue(filters);
  getCompareDateMock.mockReturnValue({
    compare: 'prev',
    startDate: comparisonStart,
    endDate: comparisonEnd,
  });
  getWebsiteActiveTimeMock
    .mockResolvedValueOnce({ total: 90, visits: 2, average: 45 })
    .mockResolvedValueOnce({ total: 30, visits: 1, average: 30 });

  const response = await GET(
    new Request(
      'http://localhost/api/websites/website-1/active-time?startAt=1786986000000&endAt=1787075999999',
    ),
    { params: Promise.resolve({ websiteId: 'website-1' }) },
  );

  expect(getQueryFiltersMock).toHaveBeenCalledWith(query, 'website-1');
  expect(getWebsiteActiveTimeMock).toHaveBeenNthCalledWith(1, 'website-1', filters);
  expect(getWebsiteActiveTimeMock).toHaveBeenNthCalledWith(2, 'website-1', {
    ...filters,
    startDate: comparisonStart,
    endDate: comparisonEnd,
  });
  await expect(response.json()).resolves.toEqual({
    total: 90,
    visits: 2,
    average: 45,
    comparison: { total: 30, visits: 1, average: 30 },
  });
});
