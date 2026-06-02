import { getSelfMediaDashboard } from "@/domain/self-media/runtime";
import { CalendarPage } from "@/domain/self-media/ui";

export default async function Page() {
  const snapshot = await getSelfMediaDashboard();
  return <CalendarPage snapshot={snapshot} />;
}
