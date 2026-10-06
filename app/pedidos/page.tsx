import DashboardShell from "@/components/dashboard-shell";
import OrdersLive from "@/components/orders-live";
import { PageHeader } from "@/components/ui";
import Link from "next/link";
export default function Page() {
  return (
    <DashboardShell>
      <PageHeader
        title="Pedidos"
        description="Receba, prepare e acompanhe cada pedido."
        actions={
          <Link className="primary-btn" href="/pdv">
            Novo pedido
          </Link>
        }
      />
      <section className="panel">
        <OrdersLive />
      </section>
    </DashboardShell>
  );
}
