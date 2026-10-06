"use client";
import { useState } from "react";
import { z } from "zod";
import { merchantSchema } from "@/lib/schemas/catalog";
import { useResource, ResourceState } from "./shared/resource";
import { api } from "@/lib/client";
import { toast } from "sonner";
import ImageUpload from "./shared/image-upload";
import Link from "next/link";
import {
  Store,
  Palette,
  Clock,
  CreditCard,
  Bike,
  MessageCircle,
  UserRound,
} from "lucide-react";
import { useWorkspace } from "./workspace-context";
import StoreAvailability from "./store-availability";
import MenuAppearanceEditor from "./menu-appearance-editor";
import { resolveAppearance } from "@/lib/menu-appearance";
const tabs = [
  {
    id: "loja",
    name: "Minha loja",
    hint: "Nome, contato e endereço",
    Icon: Store,
  },
  {
    id: "aparencia",
    name: "Fotos e marca",
    hint: "Deixe com a sua cara",
    Icon: Palette,
  },
  { id: "horarios", name: "Horários", hint: "Quando você atende", Icon: Clock },
  {
    id: "pagamentos",
    name: "Pagamentos",
    hint: "Como o cliente paga",
    Icon: CreditCard,
  },
];
const descriptions: Record<string, string> = {
  loja: "Seus clientes veem essas informações no cardápio. Preencha do seu jeito.",
  aparencia:
    "Escolha suas fotos e personalize as cores, os botões e os textos do seu cardápio.",
  horarios:
    "Mostre seus horários aos clientes. Para começar ou pausar os pedidos, use o botão no topo.",
  pagamentos:
    "Marque as formas de pagamento aceitas na entrega ou retirada. A cobrança é feita por você.",
};
type Settings = z.output<typeof merchantSchema>;
function Form({
  initial,
  initialTab,
}: {
  initial: Settings;
  initialTab: string;
}) {
  const { user, refresh } = useWorkspace();
  const [data, setData] = useState<Settings>({
    ...initial,
    appearance: resolveAppearance(initial.appearance, initial.primaryColor),
    hours: initial.hours || undefined,
    description: initial.description || "",
    address: initial.address || "",
    phone: initial.phone ? "+" + initial.phone.replace(/\D/g, "") : "",
    deliveryMinimum: Number(initial.deliveryMinimum || 0),
    pickupMinimum: Number(initial.pickupMinimum || 0),
  });
  const [tab, setTab] = useState(
    tabs.some((t) => t.id === initialTab) ? initialTab : "loja",
  );
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState(0);
  function field<K extends keyof Settings>(key: K, value: Settings[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }
  return (
    <form
      className="panel settings-panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api("/api/settings", {
            method: "PUT",
            body: JSON.stringify({ ...data, isOpen: user.merchant.isOpen }),
          });
          await refresh();
          toast.success("Configurações salvas.");
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <nav className="settings-tabs">
        {tabs.map(({ id, name, hint, Icon }) => (
          <button
            type="button"
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
            key={id}
            aria-pressed={tab === id}
          >
            <Icon size={20} />
            <span>
              {name}
              <small>{hint}</small>
            </span>
          </button>
        ))}
        <Link href="/configuracoes/fretes">
          <Bike size={20} />
          Entregas
        </Link>
        <Link href="/configuracoes/integracoes/whatsapp">
          <MessageCircle size={20} />
          WhatsApp
        </Link>
        <Link href="/perfil">
          <UserRound size={20} />
          Minha conta
        </Link>
      </nav>
      <div className="settings-content">
        <div className="settings-intro">
          <h2>{tabs.find((t) => t.id === tab)?.name}</h2>
          <p>{descriptions[tab]}</p>
        </div>
        {tab === "loja" && (
          <div className="settings-status">
            <p>
              <b>Você decide quando receber pedidos</b>
              <small>Essa mudança é salva na hora.</small>
            </p>
            <StoreAvailability />
          </div>
        )}
        {tab === "loja" && (
          <div className="form-grid">
            {(
              ["name", "slug", "phone", "address", "estimatedTime"] as const
            ).map((key, i) => (
              <label key={key}>
                {
                  [
                    "Nome",
                    "Endereço do cardápio",
                    "WhatsApp da loja",
                    "Endereço para retirada",
                    "Prazo de entrega",
                  ][i]
                }
                <input
                  aria-label={
                    [
                      "Nome",
                      "Endereço do cardápio",
                      "WhatsApp da loja",
                      "Endereço para retirada",
                      "Prazo de entrega",
                    ][i]
                  }
                  placeholder={
                    key === "phone"
                      ? "(11) 99999-9999"
                      : key === "estimatedTime"
                        ? "30 a 50 minutos"
                        : undefined
                  }
                  type={key === "phone" ? "tel" : "text"}
                  value={data[key] || ""}
                  onChange={(e) => field(key, e.target.value)}
                />
                {key === "slug" && (
                  <small className="field-hint">
                    Seu link termina em /loja/{data.slug}. Use letras
                    minúsculas, números e hífens. Ao mudar, compartilhe o novo
                    link.
                  </small>
                )}
                {key === "phone" && (
                  <small className="field-hint">
                    Inclua o DDD. Para outro país, use + e o código do país.
                  </small>
                )}
              </label>
            ))}
            <label>
              Pedido mínimo de entrega (R$)
              <input
                type="number"
                min="0"
                step=".01"
                value={data.deliveryMinimum}
                onChange={(e) =>
                  field("deliveryMinimum", Number(e.target.value))
                }
              />
            </label>
            <label>
              Pedido mínimo de retirada (R$)
              <input
                type="number"
                min="0"
                step=".01"
                value={data.pickupMinimum}
                onChange={(e) => field("pickupMinimum", Number(e.target.value))}
              />
            </label>
            <label className="span-2">
              Descrição
              <textarea
                value={data.description}
                onChange={(e) => field("description", e.target.value)}
              />
            </label>
          </div>
        )}
        {tab === "aparencia" && (
          <div className="form-grid">
            <ImageUpload
              label="Logo"
              folder="logos"
              value={{ imageUrl: data.logoUrl, imageKey: data.logoKey }}
              onChange={(v) =>
                setData({ ...data, logoUrl: v.imageUrl, logoKey: v.imageKey })
              }
              onBusyChange={(b) => setUploads((n) => n + (b ? 1 : -1))}
            />
            <ImageUpload
              label="Capa"
              folder="covers"
              aspectRatio="16 / 9"
              value={{ imageUrl: data.coverUrl, imageKey: data.coverKey }}
              onChange={(v) =>
                setData({ ...data, coverUrl: v.imageUrl, coverKey: v.imageKey })
              }
              onBusyChange={(b) => setUploads((n) => n + (b ? 1 : -1))}
            />
            <ImageUpload
              label="Foto do estabelecimento"
              folder="establishment"
              value={{
                imageUrl: data.imageUrl || null,
                imageKey: data.imageKey || null,
              }}
              onChange={(v) => setData({ ...data, ...v })}
              onBusyChange={(b) => setUploads((n) => n + (b ? 1 : -1))}
            />
          </div>
        )}
        {tab === "aparencia" && (
          <MenuAppearanceEditor
            value={resolveAppearance(data.appearance, data.primaryColor)}
            onChange={(appearance) =>
              setData((current) => ({
                ...current,
                appearance,
                primaryColor: appearance.buttonColor,
              }))
            }
            name={data.name}
            description={data.description}
            logoUrl={data.logoUrl}
            coverUrl={data.coverUrl}
          />
        )}
        {tab === "horarios" && (
          <div className="stack">
            {(
              data.hours ||
              [
                "Domingo",
                "Segunda",
                "Terça",
                "Quarta",
                "Quinta",
                "Sexta",
                "Sábado",
              ].map((day) => ({
                day,
                open: "18:00",
                close: "23:00",
                closed: false,
              }))
            ).map((h, i, all) => (
              <div className="schedule-row" key={h.day}>
                <strong>{h.day}</strong>
                <input
                  aria-label={"Abertura " + h.day}
                  type="time"
                  value={h.open}
                  onChange={(e) =>
                    field(
                      "hours",
                      all.map((x, j) =>
                        i === j ? { ...x, open: e.target.value } : x,
                      ),
                    )
                  }
                />
                <input
                  aria-label={"Fechamento " + h.day}
                  type="time"
                  value={h.close}
                  onChange={(e) =>
                    field(
                      "hours",
                      all.map((x, j) =>
                        i === j ? { ...x, close: e.target.value } : x,
                      ),
                    )
                  }
                />
                <label>
                  <input
                    type="checkbox"
                    checked={h.closed}
                    onChange={(e) =>
                      field(
                        "hours",
                        all.map((x, j) =>
                          i === j ? { ...x, closed: e.target.checked } : x,
                        ),
                      )
                    }
                  />{" "}
                  Fechado
                </label>
              </div>
            ))}
          </div>
        )}
        {tab === "pagamentos" && (
          <div className="stack">
            {(
              ["Pix", "Dinheiro", "Crédito", "Débito", "Vale-refeição"] as const
            ).map((m) => (
              <label className="check-label payment-choice" key={m}>
                <input
                  type="checkbox"
                  checked={data.paymentMethods.includes(m)}
                  onChange={(e) =>
                    field(
                      "paymentMethods",
                      e.target.checked
                        ? [...data.paymentMethods, m]
                        : data.paymentMethods.filter((p) => p !== m),
                    )
                  }
                />
                {m}
              </label>
            ))}
          </div>
        )}
        <div className="form-footer">
          <button className="primary-btn" disabled={busy || uploads > 0}>
            {busy ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </div>
    </form>
  );
}
export default function SettingsForm({
  initialTab = "loja",
}: {
  initialTab?: string;
}) {
  const r = useResource<Settings>("/api/settings");
  return r.data ? (
    <Form initial={r.data} initialTab={initialTab} />
  ) : (
    <ResourceState {...r} retry={r.refresh} />
  );
}
