import { getCompareDate } from '@/lib/date';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { filterParams, withDateRange } from '@/lib/schema';
import { canViewWebsiteSection } from '@/permissions';
import { getWebsiteActiveTime } from '@/queries/sql/getWebsiteActiveTime';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = withDateRange({
    ...filterParams,
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;

  if (!(await canViewWebsiteSection(auth, websiteId, ['overview', 'compare']))) {
    return unauthorized();
  }

  const filters = await getQueryFilters(query, websiteId);
  const data = await getWebsiteActiveTime(websiteId, filters);
  const { startDate, endDate } = getCompareDate(
    filters.compare ?? 'prev',
    filters.startDate,
    filters.endDate,
  );
  const comparison = await getWebsiteActiveTime(websiteId, {
    ...filters,
    startDate,
    endDate,
  });

  return json({ ...data, comparison });
}
