import { previewSelfMediaImport } from "@/domain/self-media/runtime";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await previewSelfMediaImport(body);
    return Response.json(result);
  } catch (error) {
    return Response.json({ errorMessage: error instanceof Error ? error.message : "导入预览失败" }, { status: 400 });
  }
}
