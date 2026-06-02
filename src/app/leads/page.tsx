import { getSelfMediaDashboard } from "@/domain/self-media/runtime";
import { LeadsPage } from "@/domain/self-media/ui";

export default async function Page() {
  const snapshot = await getSelfMediaDashboard();
  return <LeadsPage snapshot={snapshot} />;
}
