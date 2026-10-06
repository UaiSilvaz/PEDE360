import DashboardShell from "@/components/dashboard-shell";
import Conversations from "@/components/conversations";
import { PageHeader } from "@/components/ui";
export default function Page() {
  return (
    <DashboardShell>
      <PageHeader title="Central de WhatsApp" />
      <Conversations />
    </DashboardShell>
  );
}
