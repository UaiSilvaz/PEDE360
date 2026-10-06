"use client";
import { useResource, ResourceState, useNow } from "./shared/resource";
import { money } from "@/lib/client";
import { StatCard } from "./ui";
import { typeLabels } from "@/lib/view-types";
import { ClipboardList, Wallet, ReceiptText, Users } from "lucide-react";
type Summary = {
  customers: number;
  orders: {
    total: string;
    status: string;
    type: string;
    createdAt: string;
    items: { name: string; quantity: number; total: string }[];
  }[];
};
export default function Metrics({ report = false }: { report?: boolean }) {
  const now = useNow();
  const r = useResource<Summary>("/api/operations?kind=summary", 10000);
  if (!r.data) return <ResourceState {...r} retry={r.refresh} />;
  const today = new Date(now).toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
  const orders = r.data.orders.filter((o) =>
    report
      ? new Date(o.createdAt).getTime() > now - 7 * 86400000
      : new Date(o.createdAt).toLocaleDateString("en-CA", {
          timeZone: "America/Sao_Paulo",
        }) === today,
  );
  const total = orders.reduce((s, o) => s + Number(o.total), 0);
  const ranking: Record<string, { quantity: number; total: number }> = {};
  orders.forEach((o) =>
    o.items.forEach((i) => {
      const item = ranking[i.name] || { quantity: 0, total: 0 };
      item.quantity += i.quantity;
      item.total += Number(i.total);
      ranking[i.name] = item;
    }),
  );
  return (
    <>
      <div className="stats-grid">
        <StatCard
          label={report ? "Pedidos · 7 dias" : "Pedidos hoje"}
          icon={<ClipboardList size={20} />}
          value={String(orders.length)}
        />
        <StatCard
          label="Valor dos pedidos"
          icon={<Wallet size={20} />}
          value={money(total)}
          detail="Exclui cancelados; não representa recebimento"
        />
        <StatCard
          label="Média por pedido"
          icon={<ReceiptText size={20} />}
          value={money(orders.length ? total / orders.length : 0)}
        />
        <StatCard
          label="Clientes cadastrados"
          icon={<Users size={20} />}
          value={String(r.data.customers)}
        />
      </div>
      {report && (
        <div className="reports-grid">
          <section className="panel compact">
            <h2>Produtos mais pedidos</h2>
            {Object.entries(ranking)
              .sort((a, b) => b[1].quantity - a[1].quantity)
              .slice(0, 10)
              .map(([name, value]) => (
                <div className="line-item" key={name}>
                  <span>
                    {name} · {value.quantity} un.
                  </span>
                  <b>{money(value.total)}</b>
                </div>
              ))}
            {!orders.length && <p>Sem pedidos no período.</p>}
          </section>
          <section className="panel compact">
            <h2>Canais de venda</h2>
            {Object.entries(typeLabels).map(([key, name]) => (
              <div className="line-item" key={key}>
                <span>{name}</span>
                <b>{orders.filter((o) => o.type === key).length}</b>
              </div>
            ))}
          </section>
        </div>
      )}
    </>
  );
}
