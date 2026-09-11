import { beforeEach, expect, test, vi } from 'vitest';
import { parseRequest } from '@/lib/request';
import { canViewWebsiteSection } from '@/permissions';
import { getSessionActiveTime } from '@/queries/sql/sessions/getSessionActiveTime';
import { GET } from './route';

vi.mock('@/lib/request', () => ({
  parseRequest: vi.fn(),
}));

vi.mock('@/permissions', () => ({
  canViewWebsiteSection: vi.fn(),
}));

vi.mock('@/queries/sql/sessions/getSessionActiveTime', () => ({
  getSessionActiveTime: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const canViewWebsiteSectionMock = vi.mocked(canViewWebsiteSection);
const getSessionActiveTimeMock = vi.mocked(getSessionActiveTime);

beforeEach(() => {
  parseRequestMock.mockReset();
  canViewWebsiteSectionMock.mockReset();
  getSessionActiveTimeMock.mockReset();
});

test('returns active time for an accessible session', async () => {
  parseRequestMock.mockResolvedValue({ auth: {}, error: undefined });
  canViewWebsiteSectionMock.mockResolvedValue(true);
  getSessionActiveTimeMock.mockResolvedValue({ total: 90, visits: 2, average: 45 });

  const response = await GET(
    new Request('http://localhost/api/websites/website-1/sessions/session-1/active-time'),
    { params: Promise.resolve({ websiteId: 'website-1', sessionId: 'session-1' }) },
  );

  expect(getSessionActiveTimeMock).toHaveBeenCalledWith('website-1', 'session-1');
  await expect(response.json()).resolves.toEqual({ total: 90, visits: 2, average: 45 });
});
