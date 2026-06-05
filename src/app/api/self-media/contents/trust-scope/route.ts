import { updateSelfMediaContentTrustedScope } from "@/domain/self-media/runtime";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const result = await updateSelfMediaContentTrustedScope(body);
    return Response.json(result);
  } catch (error) {
    return Response.json({ errorMessage: error instanceof Error ? error.message : "内容可信范围更新失败" }, { status: 400 });
  }
}
