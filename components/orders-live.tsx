"use client";
import { useState } from "react";
import { useResource, ResourceState } from "./shared/resource";
import { api, money } from "@/lib/client";
import { toast } from "sonner";
import { statusLabels, typeLabels, type OrderView } from "@/lib/view-types";
import { whatsappLink } from "@/lib/whatsapp/link";
import Modal from "./shared/modal";
import CourierPicker from "./courier-picker";
const next: Record<string, string> = {
  RECEIVED: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "READY",
  READY: "DELIVERING",
  DELIVERING: "FINISHED",
};
export default function OrdersLive() {
  const r = useResource<OrderView[]>("/api/orders", 5000);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const selected = r.data?.find((o) => o.id === selectedId);
  async function update(order: OrderView, status: string) {
    if (
      status === "CANCELED" &&
      !confirm("Cancelar pedido #" + order.code + "?")
    )
      return;
    setBusy(true);
    try {
      await api("/api/orders", {
        method: "PATCH",
        body: JSON.stringify({ id: order.id, status }),
      });
      await r.refresh();
      toast.success("Status atualizado.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (r.loading || r.error) return <ResourceState {...r} retry={r.refresh} />;
  const list = (r.data || []).filter(
    (o) =>
      (!status || o.status === status) &&
      (!type || o.type === type) &&
      (String(o.code) + " " + o.customer?.name + " " + o.customer?.phone)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="orders-filters">
        <input
          aria-label="Buscar pedido"
          placeholder="Pedido, cliente ou telefone"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {Object.entries(statusLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          aria-label="Modalidade"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">Todas as modalidades</option>
          {Object.entries(typeLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="live-orders">
        {list.map((order) => (
          <button
            className="live-order"
            key={order.id}
            onClick={() => setSelectedId(order.id)}
          >
            <span>
              <b>#{order.code}</b>
              <small>{new Date(order.createdAt).toLocaleString("pt-BR")}</small>
            </span>
            <span>
              <b>{order.customer?.name || "Cliente"}</b>
              <small>{typeLabels[order.type]}</small>
            </span>
            <span
              className={
                "badge badge-" +
                (order.status === "CANCELED"
                  ? "red"
                  : order.status === "FINISHED"
                    ? "gray"
                    : "green")
              }
            >
              {statusLabels[order.status]}
            </span>
            <strong>{money(order.total)}</strong>
          </button>
        ))}
      </div>
      {!list.length && (
        <div className="empty-state">
          <h3>Nenhum pedido encontrado</h3>
          <p>Pedidos do cardápio e do PDV aparecem aqui automaticamente.</p>
        </div>
      )}
      {selected && (
        <Modal
          title={"Pedido #" + selected.code}
          onClose={() => setSelectedId(undefined)}
        >
          <div className="stack">
            <div>
              <h3>{selected.customer?.name}</h3>
              <p>{selected.customer?.phone}</p>
              <p>
                {typeLabels[selected.type]}{" "}
                {selected.tableNumber && "· Mesa " + selected.tableNumber}
              </p>
              <p>{selected.address}</p>
              <span className="badge badge-green">
                {statusLabels[selected.status]}
              </span>
            </div>
            {selected.items.map((i) => (
              <div key={i.id}>
                <div className="line-item">
                  <b>
                    {i.quantity}x {i.name}
                  </b>
                  <strong>{money(i.total)}</strong>
                </div>
                <small>
                  {i.options
                    .map((o) => o.name + " (" + money(o.price) + ")")
                    .join(", ")}
                </small>
                {i.notes && <p>{i.notes}</p>}
              </div>
            ))}
            <div className="totals">
              <div>
                <span>Entrega</span>
                <b>{money(selected.deliveryFee)}</b>
              </div>
              <div>
                <span>Desconto</span>
                <b>{money(selected.discount)}</b>
              </div>
              <div className="grand">
                <span>Total</span>
                <b>{money(selected.total)}</b>
              </div>
            </div>
            <p>Pagamento: {selected.paymentMethod} · a receber / conferir</p>
            {selected.notes && <p>Observações: {selected.notes}</p>}
            {selected.type === "DELIVERY" &&
              !["FINISHED", "CANCELED"].includes(selected.status) && (
                <CourierPicker
                  orderId={selected.id}
                  current={selected.courier?.id}
                  onSaved={() => void r.refresh()}
                />
              )}
            <h3>Histórico do pedido</h3>
            <ol className="timeline">
              {selected.events.map((e) => (
                <li key={e.id}>
                  {statusLabels[e.status]}
                  <small>{new Date(e.createdAt).toLocaleString("pt-BR")}</small>
                </li>
              ))}
            </ol>
            <div className="inline-actions">
              {selected.customer &&
                whatsappLink(
                  selected.customer.phone,
                  "Olá! Sobre seu pedido #" + selected.code,
                ) && (
                  <a
                    className="outline-btn"
                    href={whatsappLink(
                      selected.customer.phone,
                      "Olá! Sobre seu pedido #" + selected.code,
                    )!}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Conversar no WhatsApp
                  </a>
                )}
              {next[selected.status] && (
                <button
                  className="primary-btn"
                  disabled={busy}
                  onClick={() =>
                    void update(
                      selected,
                      selected.status === "READY" &&
                        selected.type !== "DELIVERY"
                        ? "FINISHED"
                        : next[selected.status],
                    )
                  }
                >
                  {
                    statusLabels[
                      selected.status === "READY" &&
                      selected.type !== "DELIVERY"
                        ? "FINISHED"
                        : next[selected.status]
                    ]
                  }
                </button>
              )}
              {!["FINISHED", "CANCELED"].includes(selected.status) && (
                <button
                  className="danger-btn"
                  disabled={busy}
                  onClick={() => void update(selected, "CANCELED")}
                >
                  Cancelar pedido
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
