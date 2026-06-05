import { getSelfMediaContentWorkbench } from "@/domain/self-media/runtime";
import { ContentPage } from "@/domain/self-media/ui";

export const dynamic = "force-dynamic";

export default async function Page() {
  const snapshot = await getSelfMediaContentWorkbench();
  return <ContentPage snapshot={snapshot} />;
}
