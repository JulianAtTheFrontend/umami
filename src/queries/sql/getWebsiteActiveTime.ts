import clickhouse from '@/lib/clickhouse';
import { ACTIVE_TIME_EVENT, ACTIVE_TIME_PROPERTY, DATA_TYPE, EVENT_TYPE } from '@/lib/constants';
import { CLICKHOUSE, PRISMA, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';
import type { QueryFilters } from '@/lib/types';

const FUNCTION_NAME = 'getWebsiteActiveTime';

export interface ActiveTimeData {
  total: number;
  visits: number;
  average: number;
}

export async function getWebsiteActiveTime(
  ...args: [websiteId: string, filters: QueryFilters]
): Promise<ActiveTimeData> {
  return runQuery({
    [PRISMA]: () => relationalQuery(...args),
    [CLICKHOUSE]: () => clickhouseQuery(...args),
  }).then(result => result?.[0]);
}

async function relationalQuery(websiteId: string, filters: QueryFilters) {
  const { timezone = 'utc' } = filters;
  const { rawQuery, parseFilters } = prisma;
  const { filterQuery, cohortQuery, excludeBounceQuery, joinSessionQuery, queryParams } =
    parseFilters({
      ...filters,
      websiteId,
      timezone,
    });

  return rawQuery(
    `
    select
      coalesce(sum(cast(event_data.number_value as decimal)), 0) as "total",
      count(distinct website_event.visit_id) as "visits",
      coalesce(
        sum(cast(event_data.number_value as decimal)) /
          nullif(count(distinct website_event.visit_id), 0),
        0
      ) as "average"
    from event_data
    join website_event on website_event.event_id = event_data.website_event_id
      and website_event.website_id = {{websiteId::uuid}}
      and website_event.created_at between {{startDate}} and {{endDate}}
      and website_event.event_type = ${EVENT_TYPE.customEvent}
      and website_event.event_name = {{eventName}}
    ${cohortQuery}
    ${excludeBounceQuery}
    ${joinSessionQuery}
    where event_data.website_id = {{websiteId::uuid}}
      and event_data.created_at between {{startDate}} and {{endDate}}
      and event_data.data_key = {{propertyName}}
      and event_data.data_type = ${DATA_TYPE.number}
      ${filterQuery}
    `,
    {
      ...queryParams,
      eventName: ACTIVE_TIME_EVENT,
      propertyName: ACTIVE_TIME_PROPERTY,
    },
    FUNCTION_NAME,
  );
}

async function clickhouseQuery(websiteId: string, filters: QueryFilters) {
  const { timezone = 'UTC' } = filters;
  const { rawQuery, parseFilters } = clickhouse;
  const { filterQuery, cohortQuery, excludeBounceQuery, queryParams } = parseFilters({
    ...filters,
    websiteId,
    timezone,
  });

  return rawQuery(
    `
    select
      if(count() = 0, 0, sum(event_data.number_value)) as total,
      uniq(website_event.visit_id) as visits,
      if(uniq(website_event.visit_id) = 0, 0, sum(event_data.number_value) / uniq(website_event.visit_id)) as average
    from event_data
    any inner join (
      select *
      from website_event
      where website_id = {websiteId:UUID}
        and created_at between {startDate:DateTime64} and {endDate:DateTime64}
        and event_type = ${EVENT_TYPE.customEvent}
        and event_name = {eventName:String}
    ) website_event
    on website_event.event_id = event_data.event_id
      and website_event.session_id = event_data.session_id
      and website_event.website_id = event_data.website_id
    ${cohortQuery}
    ${excludeBounceQuery}
    where event_data.website_id = {websiteId:UUID}
      and event_data.created_at between {startDate:DateTime64} and {endDate:DateTime64}
      and event_data.event_name = {eventName:String}
      and event_data.data_key = {propertyName:String}
      and event_data.data_type = ${DATA_TYPE.number}
      ${filterQuery}
    `,
    {
      ...queryParams,
      eventName: ACTIVE_TIME_EVENT,
      propertyName: ACTIVE_TIME_PROPERTY,
    },
    FUNCTION_NAME,
  );
}
