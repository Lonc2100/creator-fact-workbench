import { getSelfMediaDashboard } from "@/domain/self-media/runtime";
import { ContentPage } from "@/domain/self-media/ui";

export default async function Page() {
  const snapshot = await getSelfMediaDashboard();
  return <ContentPage snapshot={snapshot} />;
}
