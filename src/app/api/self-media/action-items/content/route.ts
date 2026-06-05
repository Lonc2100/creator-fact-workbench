import { createSelfMediaContentFromActionItem } from "@/domain/self-media/runtime";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createSelfMediaContentFromActionItem(body);
    return Response.json(result);
  } catch (error) {
    return Response.json({ errorMessage: error instanceof Error ? error.message : "行动项转内容失败" }, { status: 400 });
  }
}
