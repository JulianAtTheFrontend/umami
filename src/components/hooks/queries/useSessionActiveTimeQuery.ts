import { useApi } from '../useApi';

export interface SessionActiveTimeData {
  total: number;
  visits: number;
  average: number;
}

export function useSessionActiveTimeQuery(websiteId: string, sessionId: string) {
  const { get, useQuery } = useApi();

  return useQuery<SessionActiveTimeData>({
    queryKey: ['session:active-time', { websiteId, sessionId }],
    queryFn: () => get(`/websites/${websiteId}/sessions/${sessionId}/active-time`),
    enabled: Boolean(websiteId && sessionId),
  });
}
