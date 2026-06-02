import { getSelfMediaDashboard } from "@/domain/self-media/runtime";
import { ImportPage } from "@/domain/self-media/ui";

export default async function Page() {
  const snapshot = await getSelfMediaDashboard();
  return <ImportPage snapshot={snapshot} />;
}
