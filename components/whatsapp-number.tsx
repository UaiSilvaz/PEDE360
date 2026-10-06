"use client";
import { useState } from "react";
import { MessageCircle, Check, ArrowUpRight } from "lucide-react";
import { api } from "@/lib/client";
import { useResource, ResourceState } from "./shared/resource";
import { useWorkspace } from "./workspace-context";
import { toast } from "sonner";
export default function WhatsAppNumber() {
  const r = useResource<{ phone: string | null }>("/api/settings");
  const { refresh } = useWorkspace();
  const [busy, setBusy] = useState(false);
  return (
    <section className="panel compact whatsapp-simple">
      <div className="whatsapp-heading">
        <span className="bubble-icon">
          <MessageCircle size={23} />
        </span>
        <div>
          <h2>Seu WhatsApp, sem complicação</h2>
          <p>Use o número em que você já atende seus clientes.</p>
        </div>
      </div>
      {!r.data ? (
        <ResourceState {...r} retry={r.refresh} />
      ) : (
        <>
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const phone = String(
                new FormData(e.currentTarget).get("phone") || "",
              );
              setBusy(true);
              try {
                await api("/api/settings", {
                  method: "PATCH",
                  body: JSON.stringify({ phone }),
                });
                await r.refresh();
                await refresh();
                toast.success("WhatsApp da loja salvo!");
              } catch (error) {
                toast.error((error as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              WhatsApp da loja
              <input
                aria-label="WhatsApp da loja"
                name="phone"
                type="tel"
                autoComplete="tel"
                key={r.data.phone}
                defaultValue={
                  r.data.phone ? "+" + r.data.phone.replace(/\D/g, "") : ""
                }
                placeholder="(11) 99999-9999"
                required
              />
              <small className="field-hint">
                Digite o número com DDD. Para outro país, inclua + e o código do
                país.
              </small>
            </label>
            <button className="primary-btn" disabled={busy}>
              <Check size={17} />
              {busy ? "Salvando…" : "Salvar meu WhatsApp"}
            </button>
          </form>
          <div className="connection-preview">
            <b>
              {r.data.phone
                ? "Número salvo. Seu cliente já pode chamar você."
                : "Como funciona?"}
            </b>
            <p>
              Depois de finalizar a compra, o cliente toca em “Enviar pedido
              pelo WhatsApp”. Uma conversa com sua loja abre com o resumo pronto
              para ele enviar.
            </p>
            <p>
              O envio depende desse toque do cliente. Para mensagens
              automáticas, configure a conexão oficial abaixo.
            </p>
          </div>
          {r.data.phone && (
            <a
              className="text-link"
              style={{ marginTop: 18 }}
              href={"https://wa.me/" + r.data.phone.replace(/\D/g, "")}
              target="_blank"
              rel="noreferrer"
            >
              Conferir meu número no WhatsApp
              <ArrowUpRight size={16} />
            </a>
          )}
        </>
      )}
    </section>
  );
}
