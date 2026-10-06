import DashboardShell from "@/components/dashboard-shell";
import Team from "@/components/team";
import { PageHeader } from "@/components/ui";
export default function Page() {
  return (
    <DashboardShell>
      <PageHeader
        title="Equipe e atividade"
        description="Permissões centralizadas e histórico das alterações."
      />
      <Team />
    </DashboardShell>
  );
}
