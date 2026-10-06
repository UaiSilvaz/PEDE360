"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useResource, ResourceState } from "./shared/resource";
import type { IntegrationView, WhatsAppTemplate } from "@/lib/whatsapp/types";
import { toast } from "sonner";
import WhatsAppNumber from "./whatsapp-number";
const labels = {
  orderReceivedWhatsapp: "Pedido recebido",
  orderConfirmedWhatsapp: "Pedido confirmado",
  orderPreparingWhatsapp: "Em preparo",
  orderReadyWhatsapp: "Pronto",
  orderOutForDeliveryWhatsapp: "Saiu para entrega",
  orderDeliveredWhatsapp: "Entregue",
};
type NotifySettings = {
  templateName: string | null;
  templateLanguage: string;
} & Record<keyof typeof labels, boolean>;
const defaults: NotifySettings = {
  templateName: null,
  templateLanguage: "pt_BR",
  orderReceivedWhatsapp: false,
  orderConfirmedWhatsapp: false,
  orderPreparingWhatsapp: false,
  orderReadyWhatsapp: false,
  orderOutForDeliveryWhatsapp: false,
  orderDeliveredWhatsapp: false,
};
function Notifications() {
  const r = useResource<{
    settings: NotifySettings | null;
    jobs: { id: string; state: string; error: string | null }[];
  }>("/api/whatsapp/notifications");
  const [saving, setSaving] = useState(false);
  return (
    <section className="panel compact">
      <h2>Atualizações de pedidos</h2>
      <ResourceState {...r} retry={r.refresh} />
      {r.data && (
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const data = {
              ...defaults,
              templateName: String(form.get("templateName") || "") || null,
              templateLanguage: String(form.get("templateLanguage") || "pt_BR"),
            };
            for (const key of Object.keys(labels) as (keyof typeof labels)[])
              data[key] = form.has(key);
            setSaving(true);
            try {
              await api("/api/whatsapp/notifications", {
                method: "PUT",
                body: JSON.stringify(data),
              });
              toast.success("Preferências salvas.");
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setSaving(false);
            }
          }}
        >
          {Object.entries(labels).map(([key, label]) => (
            <label className="check-label" key={key}>
              <input
                name={key}
                type="checkbox"
                defaultChecked={
                  r.data?.settings?.[key as keyof typeof labels] || false
                }
              />
              {label}
            </label>
          ))}
          <label>
            Template aprovado para fora da janela de atendimento
            <input
              name="templateName"
              defaultValue={r.data.settings?.templateName || ""}
              placeholder="atualizacao_pedido"
            />
          </label>
          <label>
            Idioma
            <input
              name="templateLanguage"
              defaultValue={r.data.settings?.templateLanguage || "pt_BR"}
            />
          </label>
          <p className="muted">
            O corpo do template deve aceitar três parâmetros: nome, número do
            pedido e status. Só enviamos com autorização do cliente e a opção
            correspondente ativa.
          </p>
          <button className="primary-btn" disabled={saving}>
            Salvar notificações
          </button>
          <details>
            <summary>Últimos envios</summary>
            {r.data.jobs.length ? (
              r.data.jobs.map((j) => (
                <p key={j.id}>
                  {j.state}
                  {j.error ? " · " + j.error : ""}
                </p>
              ))
            ) : (
              <p>Nenhuma notificação processada.</p>
            )}
          </details>
        </form>
      )}
    </section>
  );
}
export function TemplateList() {
  const r = useResource<WhatsAppTemplate[]>("/api/whatsapp/templates");
  if (!r.data) return <ResourceState {...r} retry={r.refresh} />;
  return (
    <section className="panel compact">
      <button className="outline-btn" onClick={() => void r.refresh()}>
        Atualizar da Meta
      </button>
      {!r.data.length && <p>Nenhum template encontrado.</p>}
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Idioma</th>
              <th>Status na Meta</th>
              <th>Categoria</th>
            </tr>
          </thead>
          <tbody>
            {r.data.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{t.language}</td>
                <td>{t.status}</td>
                <td>{t.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
export default function WhatsAppSettings() {
  const r = useResource<IntegrationView>("/api/whatsapp/integration");
  const [busy, setBusy] = useState(false);
  const [connect, setConnect] = useState(false);
  const [test, setTest] = useState(false);
  async function action(method: string) {
    setBusy(true);
    try {
      await api("/api/whatsapp/integration", { method });
      toast.success(
        method === "DELETE" ? "Integração desconectada." : "Conexão validada.",
      );
      await r.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!r.data) return <ResourceState {...r} retry={r.refresh} />;
  const config = r.data;
  return (
    <div className="stack">
      <WhatsAppNumber />
      <details className="advanced-settings">
        <summary>Mensagens automáticas e atendimento pelo painel</summary>
        <p>
          A conexão oficial com a Meta permite responder aqui e enviar
          atualizações de pedidos. Esta etapa precisa das credenciais da sua
          empresa. O número cadastrado acima já permite que o cliente envie o
          resumo pelo WhatsApp.
        </p>
        <section className="panel compact">
          <span
            className={
              "badge badge-" +
              (config.status === "CONNECTED" ? "green" : "gray")
            }
          >
            {config.status === "CONNECTED" ? "Conectado" : "Não conectado"}
          </span>
          <h2>WhatsApp oficial</h2>
          <p>Atenda seus clientes e acompanhe mensagens de pedidos.</p>
          {config.configurationRequired.length > 0 && (
            <p className="configuration-note">
              Configuração necessária no servidor para ativar a integração
              oficial.
            </p>
          )}
          {config.status === "CONNECTED" && (
            <>
              <p>
                {config.businessName} · {config.businessPhone}
              </p>
              <p>
                Conectado em{" "}
                {config.connectedAt &&
                  new Date(config.connectedAt).toLocaleString("pt-BR")}
              </p>
              <p>
                Webhook:{" "}
                {config.webhookVerified
                  ? "Evento assinado recebido"
                  : "Aguardando primeiro evento assinado"}
              </p>
            </>
          )}
          <div className="inline-actions">
            <button
              className="primary-btn"
              disabled={busy || config.configurationRequired.length > 0}
              onClick={() => setConnect(!connect)}
            >
              {config.status === "CONNECTED"
                ? "Atualizar conexão"
                : "Conectar WhatsApp"}
            </button>
            {config.status === "CONNECTED" && (
              <>
                <button
                  className="outline-btn"
                  disabled={busy}
                  onClick={() => void action("PUT")}
                >
                  Testar conexão
                </button>
                <button className="outline-btn" onClick={() => setTest(!test)}>
                  Enviar mensagem de teste
                </button>
                <button
                  className="danger-btn"
                  disabled={busy}
                  onClick={() => {
                    if (
                      confirm("Desconectar o WhatsApp deste estabelecimento?")
                    )
                      void action("DELETE");
                  }}
                >
                  Desconectar
                </button>
                <Link
                  className="outline-btn"
                  href="/configuracoes/integracoes/whatsapp/templates"
                >
                  Templates
                </Link>
              </>
            )}
          </div>
          {connect && (
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const data = Object.fromEntries(new FormData(form));
                setBusy(true);
                try {
                  await api("/api/whatsapp/integration", {
                    method: "POST",
                    body: JSON.stringify(data),
                  });
                  form.reset();
                  setConnect(false);
                  await r.refresh();
                  toast.success("WhatsApp conectado.");
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                WhatsApp Business Account ID
                <input name="wabaId" required inputMode="numeric" />
              </label>
              <label>
                Phone Number ID
                <input name="phoneNumberId" required inputMode="numeric" />
              </label>
              <label>
                Token de acesso
                <input
                  name="accessToken"
                  type="password"
                  autoComplete="off"
                  required
                />
              </label>
              <p className="muted">
                O token é criptografado no servidor e não é retornado para esta
                tela.
              </p>
              <button className="primary-btn" disabled={busy}>
                Validar e conectar
              </button>
            </form>
          )}
          {test && (
            <form
              className="stack"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                const data = Object.fromEntries(new FormData(e.currentTarget));
                try {
                  await api("/api/whatsapp/messages", {
                    method: "POST",
                    body: JSON.stringify(data),
                  });
                  toast.success("Mensagem aceita pela Meta.");
                  setTest(false);
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Número autorizado para teste
                <input name="to" placeholder="5517999999999" required />
              </label>
              <label>
                Nome de template aprovado
                <input name="template" required placeholder="hello_world" />
              </label>
              <label>
                Idioma
                <input name="language" defaultValue="en_US" required />
              </label>
              <p className="muted">
                Use neste teste um template aprovado sem parâmetros.
              </p>
              <button className="primary-btn" disabled={busy}>
                Enviar teste
              </button>
            </form>
          )}
        </section>
        <section className="panel compact">
          <h2>Conexão guiada com a Meta</h2>
          <p>
            Configuração necessária: Embedded Signup depende de aplicativo
            revisado, permissões e configuração no painel da Meta. A conexão por
            credenciais acima já está disponível.
          </p>
          <a
            className="outline-btn"
            href="https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/overview"
            target="_blank"
            rel="noreferrer"
          >
            Consultar etapas na Meta
          </a>
        </section>
        {config.status === "CONNECTED" && <Notifications />}
      </details>
    </div>
  );
}
