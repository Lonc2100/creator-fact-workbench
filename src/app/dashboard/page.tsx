import { getSelfMediaDashboard } from "@/domain/self-media/runtime";
import { DashboardPage } from "@/domain/self-media/ui";

export const dynamic = "force-dynamic";

export default async function Page() {
  const snapshot = await getSelfMediaDashboard();
  return <DashboardPage snapshot={snapshot} />;
}
