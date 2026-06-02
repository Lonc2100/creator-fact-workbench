import { getSelfMediaDashboard } from "@/domain/self-media/runtime";
import { ReviewsPage } from "@/domain/self-media/ui";

export default async function Page() {
  const snapshot = await getSelfMediaDashboard();
  return <ReviewsPage snapshot={snapshot} />;
}
