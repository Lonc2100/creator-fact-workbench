import { getSelfMediaContentWorkbench, getSelfMediaDashboard } from "@/domain/self-media/runtime";
import { CalendarPage } from "@/domain/self-media/ui";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [snapshot, workbench] = await Promise.all([
    getSelfMediaDashboard(),
    getSelfMediaContentWorkbench()
  ]);
  return <CalendarPage snapshot={snapshot} workbench={workbench} />;
}
