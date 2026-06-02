import { getSelfMediaCalendar } from "@/domain/self-media/runtime";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await getSelfMediaCalendar({
    view: url.searchParams.get("view") === "month" ? "month" : "week",
    platform: (url.searchParams.get("platform") || undefined) as never,
    status: (url.searchParams.get("status") || undefined) as never
  });
  return Response.json(result);
}
