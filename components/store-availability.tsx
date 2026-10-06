"use client";
import { useState } from "react";
import { Power, Pause, Check, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "./workspace-context";
import { can } from "@/lib/security/permissions";
import { api } from "@/lib/client";
import Modal from "./shared/modal";
export default function StoreAvailability({
  expanded = false,
}: {
  expanded?: boolean;
}) {
  const { user, refresh } = useWorkspace();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const isOpen = user.merchant.isOpen;
  async function update(next: boolean) {
    setBusy(true);
    try {
      await api("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ isOpen: next }),
      });
      await refresh();
      setConfirming(false);
      toast.success(
        next
          ? "Sua loja está aberta para pedidos!"
          : "Pedidos pausados. Você pode reabrir quando quiser.",
      );
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const status = (
    <>
      <span className={"availability-dot " + (isOpen ? "online" : "offline")} />
      <span>{isOpen ? "Loja aberta" : "Loja fechada"}</span>
    </>
  );
  if (!can(user.role, "settings"))
    return <span className="availability-button">{status}</span>;
  return (
    <>
      <button
        type="button"
        className={
          "availability-button " +
          (isOpen ? "is-open" : "is-closed") +
          (expanded ? " expanded" : "")
        }
        disabled={busy}
        onClick={() => (isOpen ? setConfirming(true) : void update(true))}
        aria-label={
          isOpen ? "Pausar pedidos da loja" : "Abrir loja para pedidos"
        }
      >
        {busy ? <LoaderCircle size={16} className="spinning" /> : status}
        <span className="availability-action">
          {isOpen ? "Pausar" : "Abrir loja"}
          {isOpen ? <Pause size={13} /> : <Power size={13} />}
        </span>
      </button>
      {confirming && (
        <Modal
          title="Pausar novos pedidos?"
          onClose={() => {
            if (!busy) setConfirming(false);
          }}
        >
          <div className="stack">
            <div className="help-callout">
              <Pause size={22} />
              <p>
                O cardápio continua visível, mas os clientes não poderão
                adicionar produtos ou fazer novos pedidos.
              </p>
            </div>
            <p>
              Os pedidos já recebidos continuam no painel para você finalizar
              normalmente.
            </p>
            <div className="inline-actions">
              <button
                className="outline-btn"
                disabled={busy}
                onClick={() => setConfirming(false)}
              >
                <Check size={16} />
                Manter aberta
              </button>
              <button
                className="primary-btn"
                disabled={busy}
                onClick={() => void update(false)}
              >
                {busy ? "Pausando…" : "Sim, pausar pedidos"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
