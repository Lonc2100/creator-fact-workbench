import { convertSelfMediaIdeaToContent, createSelfMediaIdea, updateSelfMediaIdea } from "@/domain/self-media/runtime";

export async function POST(request: Request) {
  const body = await request.json();
  if (body.action === "convert") {
    const result = await convertSelfMediaIdeaToContent(body);
    return Response.json(result);
  }
  const result = await createSelfMediaIdea(body);
  return Response.json(result);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const result = await updateSelfMediaIdea(body);
  return Response.json(result);
}
