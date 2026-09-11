import type { UseQueryOptions } from '@tanstack/react-query';
import { useDateParameters } from '@/components/hooks/useDateParameters';
import { useApi } from '../useApi';
import { useFilterParameters } from '../useFilterParameters';

export interface WebsiteActiveTimeData {
  total: number;
  visits: number;
  average: number;
  comparison: {
    total: number;
    visits: number;
    average: number;
  };
}

export function useWebsiteActiveTimeQuery(
  { websiteId, compare }: { websiteId: string; compare?: string },
  options?: UseQueryOptions<WebsiteActiveTimeData, Error, WebsiteActiveTimeData>,
) {
  const { get, useQuery } = useApi();
  const { startAt, endAt } = useDateParameters();
  const filters = useFilterParameters();

  return useQuery<WebsiteActiveTimeData>({
    queryKey: ['websites:active-time', { websiteId, compare, startAt, endAt, ...filters }],
    queryFn: () =>
      get(`/websites/${websiteId}/active-time`, { compare, startAt, endAt, ...filters }),
    enabled: !!websiteId,
    ...options,
  });
}
