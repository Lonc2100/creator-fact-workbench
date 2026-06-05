import { createSelfMediaActionItemFromSuggestion, updateSelfMediaActionItem } from "@/domain/self-media/runtime";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createSelfMediaActionItemFromSuggestion(body);
    return Response.json(result);
  } catch (error) {
    return Response.json({ errorMessage: error instanceof Error ? error.message : "建议转任务失败" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const result = await updateSelfMediaActionItem(body);
    return Response.json(result);
  } catch (error) {
    return Response.json({ errorMessage: error instanceof Error ? error.message : "行动项更新失败" }, { status: 400 });
  }
}
