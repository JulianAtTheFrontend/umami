import { parseRequest } from '@/lib/request';
import { json, unauthorized } from '@/lib/response';
import { canViewWebsiteSection } from '@/permissions';
import { getSessionActiveTime } from '@/queries/sql/sessions/getSessionActiveTime';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string; sessionId: string }> },
) {
  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  const { websiteId, sessionId } = await params;

  if (
    !(await canViewWebsiteSection(auth, websiteId, ['sessions', 'events', 'realtime', 'revenue']))
  ) {
    return unauthorized();
  }

  const data = await getSessionActiveTime(websiteId, sessionId);

  return json(data);
}
