import { getSelfMediaDashboard } from "@/domain/self-media/runtime";

export async function GET() {
  const snapshot = await getSelfMediaDashboard();
  return Response.json(snapshot);
}
