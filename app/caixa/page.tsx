import DashboardShell from "@/components/dashboard-shell";
import { PageHeader } from "@/components/ui";
import Operations from "@/components/operations";
export default function Page() {
  return (
    <DashboardShell>
      <PageHeader
        title="Caixa"
        description="Dados do seu estabelecimento, salvos na operação."
      />
      <Operations kind="cash" />
    </DashboardShell>
  );
}
