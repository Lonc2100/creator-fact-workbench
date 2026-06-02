import { getSelfMediaDashboard } from "@/domain/self-media/runtime";
import { OverviewPage } from "@/domain/self-media/ui";

export default async function Home() {
  const snapshot = await getSelfMediaDashboard();
  return <OverviewPage snapshot={snapshot} />;
}
