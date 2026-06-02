import { patchSelfMediaPlatformVersion, upsertSelfMediaPlatformVersion } from "@/domain/self-media/runtime";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await upsertSelfMediaPlatformVersion(body);
  return Response.json(result);
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const result = await patchSelfMediaPlatformVersion(body);
    return Response.json(result);
  } catch (error) {
    return Response.json({ errorMessage: error instanceof Error ? error.message : "平台版本更新失败" }, { status: 400 });
  }
}
