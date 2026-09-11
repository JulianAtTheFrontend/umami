import { useMessages } from '@/components/hooks';
import { useSessionActiveTimeQuery } from '@/components/hooks/queries/useSessionActiveTimeQuery';
import { MetricCard } from '@/components/metrics/MetricCard';
import { MetricsBar } from '@/components/metrics/MetricsBar';
import { formatShortTime } from '@/lib/format';

interface SessionStatsData {
  visits?: number;
  views?: number;
  events?: number;
  totaltime?: number;
}

export function SessionStats({
  data,
  websiteId,
  sessionId,
}: {
  data?: SessionStatsData;
  websiteId: string;
  sessionId: string;
}) {
  const { t, labels } = useMessages();
  const { data: activeTime } = useSessionActiveTimeQuery(websiteId, sessionId);

  return (
    <MetricsBar>
      <MetricCard label={t(labels.visits)} value={data?.visits} />
      <MetricCard label={t(labels.views)} value={data?.views} />
      <MetricCard label={t(labels.events)} value={data?.events} />
      <MetricCard
        label={t(labels.visitDuration)}
        value={data?.visits ? (data.totaltime ?? 0) / data.visits : 0}
        formatValue={n => `${+n < 0 ? '-' : ''}${formatShortTime(Math.abs(~~n), ['m', 's'], ' ')}`}
      />
      {activeTime && activeTime.visits > 0 && (
        <MetricCard
          label="Aktivzeit"
          tooltip={`${activeTime.visits} qualifizierte${activeTime.visits === 1 ? 'r' : ''} Besuch${activeTime.visits === 1 ? '' : 'e'}`}
          value={activeTime.total}
          formatValue={n =>
            `${+n < 0 ? '-' : ''}${formatShortTime(Math.abs(~~n), ['m', 's'], ' ')}`
          }
        />
      )}
    </MetricsBar>
  );
}
