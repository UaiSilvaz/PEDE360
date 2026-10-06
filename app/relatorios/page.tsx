import DashboardShell from "@/components/dashboard-shell";
import Metrics from "@/components/metrics";
import { PageHeader } from "@/components/ui";
export default function Page() {
  return (
    <DashboardShell>
      <PageHeader
        title="Relatórios"
        description="Pedidos e produtos nos últimos sete dias."
      />
      <Metrics report />
    </DashboardShell>
  );
}
