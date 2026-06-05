import { clearSelfMediaFutureSchedules, getSelfMediaCalendar } from "@/domain/self-media/runtime";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await getSelfMediaCalendar({
    view: url.searchParams.get("view") === "month" ? "month" : "week",
    platform: (url.searchParams.get("platform") || undefined) as never,
    status: (url.searchParams.get("status") || undefined) as never
  });
  return Response.json(result);
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (body.action !== "clear_future_schedules") return Response.json({ errorMessage: "不支持的日历操作。" }, { status: 400 });
    const result = await clearSelfMediaFutureSchedules();
    return Response.json(result);
  } catch (error) {
    return Response.json({ errorMessage: error instanceof Error ? error.message : "日历操作失败。" }, { status: 400 });
  }
}
