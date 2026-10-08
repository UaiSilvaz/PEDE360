"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { useResource, ResourceState } from "./shared/resource";
import { toast } from "sonner";

type Settings = {
  enabled: boolean;
  message: string;
  connected: boolean;
  businessPhone?: string;
  menuUrl: string | null;
  jobs: { id: string; state: string; error: string | null }[];
};
const states: Record<string, string> = {
  SENT: "Aceita pelo WhatsApp",
  PENDING: "Aguardando nova tentativa",
  PROCESSING: "Enviando",
  FAILED: "Falha no envio",
  SKIPPED: "Ignorada",
};
function Editor({
  data,
  refresh,
}: {
  data: Settings;
  refresh: () => Promise<void>;
}) {
  const [message, setMessage] = useState(data.message);
  const [enabled, setEnabled] = useState(data.enabled);
  const [busy, setBusy] = useState(false);
  return (
    <section className="panel compact stack">
      <h2>Resposta automática com seu cardápio</h2>
      <p>
        {data.connected
          ? `WhatsApp conectado: ${data.businessPhone}.`
          : "Você pode preparar sua mensagem agora. Os envios começam após conectar o WhatsApp oficial abaixo."}
      </p>
      <span className="muted">
        {!data.enabled
          ? "Resposta automática desativada"
          : data.connected
            ? "Resposta automática ativada"
            : "Resposta automática aguardando conexão"}
      </span>
      <form
        className="stack"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          try {
            await api("/api/whatsapp/auto-reply", {
              method: "PUT",
              body: JSON.stringify({ enabled, message }),
            });
            await refresh();
            toast.success("Resposta automática salva.");
          } catch (error) {
            toast.error((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="check-label">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Responder automaticamente às mensagens recebidas
        </label>
        <label>
          Mensagem da loja
          <textarea
            required
            maxLength={3000}
            rows={4}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>
        <p className="muted">
          O link do seu cardápio é incluído automaticamente. Cada nova mensagem
          de um cliente recebe esta resposta.
        </p>
        <div
          className="panel compact"
          aria-label="Prévia da resposta automática"
        >
          <strong>Prévia da mensagem</strong>
          <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {message.trim()}
            {"\n\n"}
            {data.menuUrl ||
              "Link do cardápio indisponível. Verifique a configuração do site."}
          </p>
        </div>
        <button className="primary-btn" disabled={busy || !message.trim()}>
          {busy ? "Salvando…" : "Salvar resposta automática"}
        </button>
      </form>
      {!!data.jobs.length && (
        <details>
          <summary>Últimas respostas automáticas</summary>
          {data.jobs.map((job) => (
            <p key={job.id}>
              {states[job.state] || job.state}
              {job.error ? " · " + job.error : ""}
            </p>
          ))}
          {data.jobs.some((job) => job.state === "PENDING") && (
            <button
              className="outline-btn"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("/api/whatsapp/auto-reply", { method: "POST" });
                  await refresh();
                  toast.success("Fila de respostas verificada.");
                } catch (error) {
                  toast.error((error as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Processar respostas pendentes
            </button>
          )}
          <p className="muted">
            A entrega pode ser acompanhada no histórico de conversas. Confira
            esse histórico antes de reenviar uma mensagem com falha.
          </p>
        </details>
      )}
    </section>
  );
}
export default function WhatsAppAutoReply() {
  const resource = useResource<Settings>("/api/whatsapp/auto-reply");
  if (!resource.data)
    return <ResourceState {...resource} retry={resource.refresh} />;
  return (
    <Editor
      key={resource.data.message + String(resource.data.enabled)}
      data={resource.data}
      refresh={resource.refresh}
    />
  );
}
