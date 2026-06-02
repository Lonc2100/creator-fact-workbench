import { createSelfMediaLead, updateSelfMediaLead } from "@/domain/self-media/runtime";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await createSelfMediaLead(body);
  return Response.json(result);
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const result = await updateSelfMediaLead(body);
    return Response.json(result);
  } catch (error) {
    return Response.json({ errorMessage: error instanceof Error ? error.message : "线索更新失败" }, { status: 400 });
  }
}
