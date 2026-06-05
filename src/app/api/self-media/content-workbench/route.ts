import { getSelfMediaContentWorkbench } from "@/domain/self-media/runtime";

export async function GET() {
  const snapshot = await getSelfMediaContentWorkbench();
  return Response.json(snapshot);
}
