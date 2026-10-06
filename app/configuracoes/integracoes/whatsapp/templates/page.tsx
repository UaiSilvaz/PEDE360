import DashboardShell from "@/components/dashboard-shell";
import { TemplateList } from "@/components/whatsapp-settings";
import { PageHeader } from "@/components/ui";
export default function Page() {
  return (
    <DashboardShell>
      <PageHeader title="Templates oficiais" />
      <TemplateList />
    </DashboardShell>
  );
}
