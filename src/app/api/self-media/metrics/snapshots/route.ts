import { upsertSelfMediaMetricSnapshot } from "@/domain/self-media/runtime";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await upsertSelfMediaMetricSnapshot(body);
    return Response.json(result);
  } catch (error) {
    return Response.json({ errorMessage: error instanceof Error ? error.message : "指标快照保存失败" }, { status: 400 });
  }
}
