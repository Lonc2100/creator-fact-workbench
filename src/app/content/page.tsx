import { getSelfMediaContentWorkbench } from "@/domain/self-media/runtime";
import { ContentPage } from "@/domain/self-media/ui";

export default async function Page() {
  const snapshot = await getSelfMediaContentWorkbench();
  return <ContentPage snapshot={snapshot} />;
}
