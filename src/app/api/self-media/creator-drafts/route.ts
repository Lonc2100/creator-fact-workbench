import { createSelfMediaCreatorVideoDraft } from "@/domain/self-media/runtime";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createSelfMediaCreatorVideoDraft(body);
    return Response.json(result);
  } catch (error) {
    return Response.json({ errorMessage: error instanceof Error ? error.message : "新视频草稿生成失败。" }, { status: 400 });
  }
}
