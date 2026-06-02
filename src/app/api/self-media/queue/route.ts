import { updateSelfMediaPublishQueue } from "@/domain/self-media/runtime";

export async function PATCH(request: Request) {
  const body = await request.json();
  const result = await updateSelfMediaPublishQueue(body);
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
