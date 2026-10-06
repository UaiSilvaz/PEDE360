import Campaigns from "@/components/campaigns";
import DashboardShell from "@/components/dashboard-shell";
import { PageHeader } from "@/components/ui";
import Operations from "@/components/operations";
export default function Page() {
  return (
    <DashboardShell>
      <PageHeader
        title="Cupons e marketing"
        description="Dados do seu estabelecimento, salvos na operação."
      />
      <Operations kind="coupons" />
      <Campaigns />
      <section className="panel compact">
        <h2>Cashback e fidelidade</h2>
        <p>Programa de recompensas ainda não habilitado.</p>
      </section>
    </DashboardShell>
  );
}
