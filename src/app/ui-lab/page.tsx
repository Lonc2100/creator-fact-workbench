import { getSelfMediaDashboard } from "@/domain/self-media/runtime";
import { UiLabPage } from "@/domain/self-media/ui";

export default async function Page() {
  const snapshot = await getSelfMediaDashboard();
  return <UiLabPage snapshot={snapshot} />;
}
