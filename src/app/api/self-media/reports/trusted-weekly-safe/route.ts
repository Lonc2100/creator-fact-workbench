import { getSelfMediaTrustedWeeklySafeReport } from "@/domain/self-media/runtime";

export async function GET() {
  const report = await getSelfMediaTrustedWeeklySafeReport();
  return Response.json(report);
}
