import { createSelfMediaAutomationRun } from "@/domain/self-media/runtime";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await createSelfMediaAutomationRun(body);
  return Response.json(result);
}
