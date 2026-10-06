"use client";
import { useState } from "react";
import { api, money } from "@/lib/client";
import { useResource, ResourceState } from "./shared/resource";
import Modal from "./shared/modal";
import { toast } from "sonner";
type Row = {
  id: string;
  name?: string;
  phone?: string;
  number?: string;
  occupied?: boolean;
  total?: number;
  active?: boolean;
  fee?: string;
  feeValue?: string;
  code?: string;
  percent?: number;
  minimum?: string;
  openingAmount?: string;
  closingAmount?: string | null;
  openedAt?: string;
  closedAt?: string | null;
  movements?: {
    id: string;
    amount: string;
    notes: string;
    createdAt: string;
  }[];
  orders?: {
    id: string;
    code?: number;
    total: string;
    status?: string;
    createdAt?: string;
  }[];
};
type Kind = "zones" | "couriers" | "tables" | "coupons" | "cash" | "customers";
export default function Operations({ kind }: { kind: Kind }) {
  const r = useResource<Row[]>("/api/operations?kind=" + kind);
  const [edit, setEdit] = useState<Row | "new" | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(data: unknown) {
    setBusy(true);
    try {
      await api("/api/operations", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setEdit(null);
      await r.refresh();
      toast.success("Alterações salvas.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (r.loading || r.error) return <ResourceState {...r} retry={r.refresh} />;
  const rows = r.data || [];
  const cash = rows.find((x) => !x.closedAt);
  const item = typeof edit === "object" && edit ? edit : undefined;
  const list = rows.filter((x) =>
    JSON.stringify(x).toLowerCase().includes(query.toLowerCase()),
  );
  function exportCsv() {
    const clean = (s: unknown) =>
      '"' +
      String(s ?? "")
        .replace(/^[=+@-]/, "'$&")
        .replace(/"/g, '""') +
      '"';
    const csv = [
      "Nome,Telefone,Pedidos,Total",
      ...rows.map((r) =>
        [
          r.name,
          r.phone,
          r.orders?.length,
          money(
            (r.orders || [])
              .filter((o) => o.status !== "CANCELED")
              .reduce((s, o) => s + Number(o.total), 0),
          ),
        ]
          .map(clean)
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "clientes.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="inline-actions">
        <input
          aria-label="Buscar registros"
          placeholder="Buscar"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {kind === "customers" ? (
          <button className="outline-btn" onClick={exportCsv}>
            Exportar CSV
          </button>
        ) : (
          <button className="primary-btn" onClick={() => setEdit("new")}>
            {kind === "cash"
              ? cash
                ? "Nova movimentação"
                : "Abrir caixa"
              : "Adicionar"}
          </button>
        )}
        {kind === "cash" && cash && (
          <button className="danger-btn" onClick={() => setEdit(cash)}>
            Fechar caixa
          </button>
        )}
      </div>
      {kind === "cash" && cash && (
        <div className="panel compact">
          <h2>Caixa aberto</h2>
          <p>
            Saldo de abertura e movimentações:{" "}
            <b>
              {money(
                Number(cash.openingAmount) +
                  (cash.movements || []).reduce(
                    (s, m) => s + Number(m.amount),
                    0,
                  ),
              )}
            </b>
          </p>
          <p className="muted">
            As vendas ainda não conciliadas não entram neste saldo. Registre o
            recebimento na movimentação.
          </p>
          {cash.movements?.map((m) => (
            <div className="line-item" key={m.id}>
              <span>{m.notes}</span>
              <b>{money(m.amount)}</b>
            </div>
          ))}
        </div>
      )}
      <div className={kind === "tables" ? "tables-grid" : "record-grid"}>
        {list.map((row) => (
          <article className="panel compact" key={row.id}>
            <h3>
              {row.name ||
                row.code ||
                (row.number
                  ? "Mesa " + row.number
                  : "Caixa · " +
                    new Date(row.openedAt!).toLocaleDateString("pt-BR"))}
            </h3>
            {row.phone && <p>{row.phone}</p>}
            {kind === "zones" && <p>Entrega: {money(row.fee || 0)}</p>}
            {kind === "couriers" && (
              <>
                <p>{row.orders?.length || 0} entregas finalizadas</p>
                <p>
                  Comissão:{" "}
                  {money((row.orders?.length || 0) * Number(row.feeValue || 0))}
                </p>
              </>
            )}
            {kind === "coupons" && (
              <p>
                {row.percent}% · mínimo {money(row.minimum || 0)}
              </p>
            )}
            {kind === "customers" && (
              <>
                <p>
                  {row.orders?.length || 0} pedidos ·{" "}
                  {money(
                    (row.orders || [])
                      .filter((o) => o.status !== "CANCELED")
                      .reduce((s, o) => s + Number(o.total), 0),
                  )}
                </p>
                <details>
                  <summary>Histórico de pedidos</summary>
                  {row.orders?.map((o) => (
                    <p key={o.id}>
                      #{o.code} · {money(o.total)} ·{" "}
                      {o.createdAt &&
                        new Date(o.createdAt).toLocaleString("pt-BR")}
                    </p>
                  ))}
                </details>
              </>
            )}
            {kind === "cash" && (
              <p>
                {row.closedAt
                  ? "Fechado · " + money(row.closingAmount || 0)
                  : "Aberto"}
              </p>
            )}
            {kind === "tables" && (
              <p>Consumo em aberto: {money(row.total || 0)}</p>
            )}
            {kind === "tables" ? (
              <button
                className="outline-btn"
                disabled={busy}
                onClick={() => {
                  if (row.occupied && !confirm("Liberar esta mesa?")) return;
                  void save({
                    kind: "table",
                    id: row.id,
                    number: row.number,
                    occupied: !row.occupied,
                  });
                }}
              >
                {row.occupied ? "Ocupada · liberar" : "Livre · ocupar"}
              </button>
            ) : (
              !["cash", "customers"].includes(kind) && (
                <>
                  <p>{row.active ? "Ativo" : "Pausado"}</p>
                  <button className="outline-btn" onClick={() => setEdit(row)}>
                    Editar
                  </button>
                </>
              )
            )}
          </article>
        ))}
      </div>
      {!rows.length && (
        <p className="empty-state">
          Nenhum registro. Os novos dados aparecerão aqui.
        </p>
      )}
      {edit && (
        <Modal
          title={
            kind === "cash"
              ? item
                ? "Fechar caixa"
                : cash
                  ? "Nova movimentação"
                  : "Abrir caixa"
              : item
                ? "Editar registro"
                : "Adicionar registro"
          }
          onClose={() => setEdit(null)}
        >
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (kind === "cash") {
                if (item) {
                  if (confirm("Confirmar fechamento do caixa?"))
                    void save({
                      kind: "cash-close",
                      id: item.id,
                      closingAmount: Number(f.get("amount")),
                    });
                } else
                  void save(
                    cash
                      ? {
                          kind: "movement",
                          id: cash.id,
                          amount: Number(f.get("amount")),
                          notes: f.get("notes"),
                        }
                      : {
                          kind: "cash-open",
                          openingAmount: Number(f.get("amount")),
                        },
                  );
                return;
              }
              const singular = {
                zones: "zone",
                couriers: "courier",
                tables: "table",
                coupons: "coupon",
                customers: "customer",
              }[kind];
              const payload: Record<string, unknown> = {
                kind: singular,
                id: item?.id,
              };
              for (const [key, value] of f.entries())
                payload[key] = [
                  "fee",
                  "feeValue",
                  "percent",
                  "minimum",
                ].includes(key)
                  ? Number(value)
                  : value;
              if (kind !== "tables") payload.active = f.get("active") === "on";
              void save(payload);
            }}
          >
            {kind === "cash" ? (
              <>
                <label>
                  {item
                    ? "Valor contado no fechamento"
                    : cash
                      ? "Valor (negativo para sangria)"
                      : "Valor inicial"}
                  <input name="amount" required type="number" step=".01" />
                </label>
                {cash && !item && (
                  <label>
                    Descrição
                    <input name="notes" required minLength={3} />
                  </label>
                )}
              </>
            ) : (
              <>
                {kind === "coupons" ? (
                  <>
                    <label>
                      Código
                      <input required name="code" defaultValue={item?.code} />
                    </label>
                    <label>
                      Desconto (%)
                      <input
                        name="percent"
                        type="number"
                        min="1"
                        max="100"
                        required
                        defaultValue={item?.percent || 10}
                      />
                    </label>
                    <label>
                      Pedido mínimo
                      <input
                        name="minimum"
                        type="number"
                        min="0"
                        step=".01"
                        defaultValue={item?.minimum || 0}
                      />
                    </label>
                  </>
                ) : kind === "tables" ? (
                  <label>
                    Número da mesa
                    <input name="number" required defaultValue={item?.number} />
                  </label>
                ) : (
                  <label>
                    Nome
                    <input
                      name="name"
                      required
                      minLength={2}
                      defaultValue={item?.name}
                    />
                  </label>
                )}
                {kind === "zones" && (
                  <label>
                    Frete (R$)
                    <input
                      name="fee"
                      type="number"
                      min="0"
                      step=".01"
                      required
                      defaultValue={item?.fee || 0}
                    />
                  </label>
                )}
                {kind === "couriers" && (
                  <>
                    <label>
                      Telefone com país e DDD
                      <input name="phone" required defaultValue={item?.phone} />
                    </label>
                    <label>
                      Comissão por entrega
                      <input
                        name="feeValue"
                        type="number"
                        min="0"
                        step=".01"
                        defaultValue={item?.feeValue || 0}
                      />
                    </label>
                  </>
                )}
                {kind !== "tables" && (
                  <label>
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={item?.active ?? true}
                    />{" "}
                    Ativo
                  </label>
                )}
              </>
            )}
            <button className="primary-btn" disabled={busy}>
              {busy ? "Salvando…" : "Salvar"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
