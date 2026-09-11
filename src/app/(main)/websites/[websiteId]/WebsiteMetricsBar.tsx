import { LoadingPanel } from '@/components/common/LoadingPanel';
import { useDateRange, useMessages } from '@/components/hooks';
import { useWebsiteActiveTimeQuery } from '@/components/hooks/queries/useWebsiteActiveTimeQuery';
import { useWebsiteStatsQuery } from '@/components/hooks/queries/useWebsiteStatsQuery';
import { MetricCard } from '@/components/metrics/MetricCard';
import { MetricsBar } from '@/components/metrics/MetricsBar';
import { formatLongNumber, formatShortTime } from '@/lib/format';

interface WebsiteMetric {
  label: string;
  value: number;
  prev?: number;
  change: number;
  formatValue: (value: number) => string;
  reverseColors?: boolean;
  tooltip?: string;
}

export function WebsiteMetricsBar({
  websiteId,
  compareMode,
}: {
  websiteId: string;
  showChange?: boolean;
  compareMode?: boolean;
}) {
  const { isAllTime, dateCompare } = useDateRange();
  const { t, labels, getErrorMessage } = useMessages();
  const { data, isLoading, isFetching, error } = useWebsiteStatsQuery({
    websiteId,
    compare: compareMode ? dateCompare?.compare : undefined,
  });
  const { data: activeTime } = useWebsiteActiveTimeQuery({
    websiteId,
    compare: compareMode ? dateCompare?.compare : undefined,
  });

  const { pageviews, visitors, visits, bounces, totaltime, comparison } = data || {};

  const activeTimeMetric: WebsiteMetric | undefined =
    activeTime && activeTime.visits > 0
      ? {
          label: 'Ø Aktivzeit / qualifizierter Besuch',
          tooltip:
            'Sichtbare Zeit mit einer manuellen Interaktion innerhalb der vergangenen Minute.',
          value: activeTime.average,
          prev: activeTime.comparison.average,
          change: activeTime.average - activeTime.comparison.average,
          formatValue: (n: number) =>
            `${+n < 0 ? '-' : ''}${formatShortTime(Math.abs(~~n), ['m', 's'], ' ')}`,
        }
      : undefined;

  const metrics: WebsiteMetric[] | null = data
    ? [
        {
          value: visitors,
          label: t(labels.visitors),
          change: visitors - comparison.visitors,
          formatValue: formatLongNumber,
        },
        {
          value: visits,
          label: t(labels.visits),
          change: visits - comparison.visits,
          formatValue: formatLongNumber,
        },
        {
          value: pageviews,
          label: t(labels.views),
          change: pageviews - comparison.pageviews,
          formatValue: formatLongNumber,
        },
        {
          label: t(labels.bounceRate),
          value: (Math.min(visits, bounces) / visits) * 100,
          prev: (Math.min(comparison.visits, comparison.bounces) / comparison.visits) * 100,
          change:
            (Math.min(visits, bounces) / visits) * 100 -
            (Math.min(comparison.visits, comparison.bounces) / comparison.visits) * 100,
          formatValue: n => `${Math.round(+n)}%`,
          reverseColors: true,
        },
        {
          label: t(labels.visitDuration),
          value: totaltime / visits,
          prev: comparison.totaltime / comparison.visits,
          change: totaltime / visits - comparison.totaltime / comparison.visits,
          formatValue: n =>
            `${+n < 0 ? '-' : ''}${formatShortTime(Math.abs(~~n), ['m', 's'], ' ')}`,
        },
        ...(activeTimeMetric ? [activeTimeMetric] : []),
      ]
    : null;

  return (
    <LoadingPanel
      data={metrics}
      isLoading={isLoading}
      isFetching={isFetching}
      error={getErrorMessage(error)}
      minHeight="136px"
    >
      <MetricsBar>
        {metrics?.map(({ label, value, prev, change, formatValue, reverseColors, tooltip }) => {
          return (
            <MetricCard
              key={label}
              value={value}
              previousValue={prev}
              label={label}
              change={change}
              formatValue={formatValue}
              reverseColors={reverseColors}
              tooltip={tooltip}
              showChange={!isAllTime}
            />
          );
        })}
      </MetricsBar>
    </LoadingPanel>
  );
}
