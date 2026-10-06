import DashboardShell from "@/components/dashboard-shell";
import Operations from "@/components/operations";
import { PageHeader } from "@/components/ui";
export default function Page() {
  return (
    <DashboardShell>
      <PageHeader
        title="Regiões de entrega"
        description="O frete é calculado no servidor a partir destas regiões."
      />
      <Operations kind="zones" />
    </DashboardShell>
  );
}
