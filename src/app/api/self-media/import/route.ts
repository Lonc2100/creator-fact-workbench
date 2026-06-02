import { importSelfMediaRequest } from "@/domain/self-media/runtime";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await importSelfMediaRequest(body);
  return Response.json(result, { status: result.run.status === "failed" ? 400 : 200 });
}
