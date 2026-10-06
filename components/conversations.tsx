"use client";
import { useState } from "react";
import Link from "next/link";
import { useResource, ResourceState, useNow } from "./shared/resource";
import { api } from "@/lib/client";
import { toast } from "sonner";
type Conversation = {
  id: string;
  whatsappNumber: string;
  lastMessageAt: string;
  lastInboundAt: string | null;
  customer: { name: string } | null;
  messages?: {
    id: string;
    direction: string;
    text: string | null;
    type: string;
    status: string;
    timestamp: string;
  }[];
  orders?: { id: string; code: number }[];
};
function Thread({ id }: { id: string }) {
  const now = useNow();
  const r = useResource<Conversation>(
    "/api/whatsapp/conversations?id=" + id,
    4000,
  );
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  if (!r.data) return <ResourceState {...r} retry={r.refresh} />;
  const c = r.data;
  const withinWindow =
    c.lastInboundAt && now - new Date(c.lastInboundAt).getTime() < 24 * 3600000;
  return (
    <>
      <header className="conversation-head">
        <div>
          <h2>{c.customer?.name || c.whatsappNumber}</h2>
          <small>{c.whatsappNumber}</small>
        </div>
        <Link className="outline-btn" href={"/pdv?conversationId=" + c.id}>
          Criar pedido
        </Link>
      </header>
      <div className="messages">
        {c.messages?.map((m) => (
          <article
            key={m.id}
            className={"message " + m.direction.toLowerCase()}
          >
            <p>{m.text || "Mensagem " + m.type}</p>
            <small>
              {new Date(m.timestamp).toLocaleString("pt-BR")} · {m.status}
            </small>
          </article>
        ))}
        {!c.messages?.length && (
          <p className="empty-state">Nenhuma mensagem nesta conversa.</p>
        )}
      </div>
      <form
        className="message-composer"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api("/api/whatsapp/messages", {
              method: "POST",
              body: JSON.stringify({ to: c.whatsappNumber, text }),
            });
            setText("");
            await r.refresh();
            toast.success("Mensagem enviada.");
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <textarea
          aria-label="Mensagem"
          required
          maxLength={4096}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            withinWindow
              ? "Escreva sua mensagem"
              : "Janela encerrada. Utilize um template aprovado."
          }
        />
        <button
          className="primary-btn"
          disabled={busy || !withinWindow || !text.trim()}
        >
          Enviar
        </button>
      </form>
      {!withinWindow && (
        <Link href="/configuracoes/integracoes/whatsapp">
          Configurar / enviar template
        </Link>
      )}
    </>
  );
}
export default function Conversations() {
  const r = useResource<Conversation[]>("/api/whatsapp/conversations", 5000);
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  if (!r.data) return <ResourceState {...r} retry={r.refresh} />;
  return (
    <div className="conversation-layout">
      <aside className="conversation-list">
        <input
          aria-label="Buscar conversas"
          placeholder="Buscar nome ou telefone"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {r.data
          .filter((c) =>
            (c.whatsappNumber + " " + c.customer?.name)
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          .map((c) => (
            <button
              className={c.id === selected ? "active" : ""}
              key={c.id}
              onClick={() => setSelected(c.id)}
            >
              <b>{c.customer?.name || c.whatsappNumber}</b>
              <small>{new Date(c.lastMessageAt).toLocaleString("pt-BR")}</small>
            </button>
          ))}
        {!r.data.length && (
          <div className="empty-state">
            <p>Nenhuma conversa recebida.</p>
            <Link href="/configuracoes/integracoes/whatsapp">
              Configurar WhatsApp oficial
            </Link>
          </div>
        )}
      </aside>
      <section className="conversation-thread">
        {selected ? (
          <Thread key={selected} id={selected} />
        ) : (
          <div className="empty-state">
            <h2>Seu atendimento, em um lugar</h2>
            <p>Selecione uma conversa para responder ou criar um pedido.</p>
          </div>
        )}
      </section>
    </div>
  );
}
