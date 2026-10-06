"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  Check,
  MessageCircle,
  Plus,
  Store,
  Palette,
  ClipboardList,
  CheckCheck,
} from "lucide-react";
import { useWorkspace } from "./workspace-context";
import { can } from "@/lib/security/permissions";
import { useResource, ResourceState } from "./shared/resource";
import ShareMenu from "./share-menu";
import StoreAvailability from "./store-availability";
import Metrics from "./metrics";
import OrdersLive from "./orders-live";
type Setup = {
  hasProducts: boolean;
  productCount: number;
  hasPhone: boolean;
  hasIdentity: boolean;
  isOpen: boolean;
};
function SetupGuide() {
  const { user } = useWorkspace();
  const r = useResource<Setup>("/api/setup", 15000);
  if (!r.data) return <ResourceState {...r} retry={r.refresh} />;
  const data = r.data;
  const steps = [
    {
      title: "Monte seu cardápio",
      text: data.hasProducts
        ? data.productCount + " produtos disponíveis"
        : "Adicione o que você vende, com foto e preço.",
      href: "/cardapio",
      Icon: BookOpen,
      done: data.hasProducts,
    },
    {
      title: "Dê a sua cara",
      text: data.hasIdentity
        ? "Sua marca já está no cardápio."
        : "Escolha a logo e a capa da sua loja.",
      href: "/configuracoes?section=aparencia",
      Icon: Palette,
      done: data.hasIdentity,
    },
    {
      title: "Coloque seu WhatsApp",
      text: data.hasPhone
        ? "Número da loja cadastrado."
        : "Receba o resumo dos pedidos nas conversas.",
      href: "/configuracoes/integracoes/whatsapp",
      Icon: MessageCircle,
      done: data.hasPhone,
    },
  ];
  const count = steps.filter((s) => s.done).length;
  return (
    <section className="setup-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">DO SEU JEITO</span>
          <h2>
            {count === 3
              ? "Sua loja está ganhando forma"
              : "Poucos ajustes. Tudo pronto."}
          </h2>
          <p>
            {count === 3
              ? "Seus ajustes estão salvos. Abra a loja e compartilhe seu cardápio."
              : "Prepare sua loja no seu ritmo. Você pode mudar tudo depois."}
          </p>
        </div>
        <span className="setup-progress">
          <span className="setup-progress-track">
            <i style={{ width: (count / 3) * 100 + "%" }} />
          </span>
          {count} de 3 ajustes
        </span>
      </div>
      <div className="setup-cards">
        {steps.map((step, index) => (
          <Link
            href={step.href}
            className={"setup-card " + (step.done ? "done" : "")}
            key={step.title}
          >
            <span className="setup-step-number">
              {step.done ? (
                <Check size={14} />
              ) : (
                String(index + 1).padStart(2, "0")
              )}
            </span>
            <span className="setup-card-icon">
              <step.Icon size={23} />
            </span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
            <span className="setup-card-action">
              {step.done ? "Revisar ajuste" : "Começar"}
              <ArrowUpRight size={17} />
            </span>
          </Link>
        ))}
      </div>
      {!user.merchant.isOpen && (
        <div className="open-reminder">
          <Store size={21} />
          <p>
            <b>Sua loja ainda está fechada.</b> Quando estiver pronto, abra para
            liberar os pedidos dos clientes.
          </p>
          <StoreAvailability />
        </div>
      )}
    </section>
  );
}
export default function HomeOverview() {
  const { user } = useWorkspace();
  return (
    <>
      <section className="welcome-section">
        <div>
          <span className="eyebrow">
            <span className="welcome-dot" />
            BOM TER VOCÊ POR AQUI
          </span>
          <h1>
            Seu negócio,
            <br />
            <em>mais leve.</em>
          </h1>
          <p>
            Olá, {user.name.split(" ")[0]}. Seu cardápio, pedidos e conversas no
            mesmo lugar.
          </p>
          <div className="inline-actions">
            {can(user.role, "orders.write") && (
              <Link className="primary-btn" href="/pdv">
                <Plus size={18} />
                Nova venda
              </Link>
            )}
            <ShareMenu />
          </div>
        </div>
        <div className="welcome-note">
          <span className="note-label">
            <span className="bubble-icon">
              <MessageCircle size={20} />
            </span>
            Deixa com o PEDE360
          </span>
          <div className="note-message">
            <p>
              {user.merchant.isOpen
                ? "Sua loja está aberta. Vamos cuidar dos pedidos de hoje?"
                : "Tudo começa com um bom cardápio. O resto, a gente organiza por aqui."}
            </p>
            <span>
              <CheckCheck size={17} /> Um passo de cada vez
            </span>
          </div>
          <div className="note-reply">
            <Store size={16} />
            {user.merchant.name}
            <span className="note-reply-dot" />
          </div>
        </div>
      </section>
      {can(user.role, "settings") && <SetupGuide />}
      <div className="section-heading today-heading">
        <div>
          <span className="eyebrow">ACOMPANHE DE PERTO</span>
          <h2>Seu dia em números</h2>
        </div>
        {can(user.role, "finance") && (
          <Link href="/relatorios" className="text-link">
            Ver resultados
            <ArrowUpRight size={16} />
          </Link>
        )}
      </div>
      <Metrics />
      <section className="panel home-orders">
        <div className="section-heading">
          <div className="section-title-icon">
            <span className="soft-icon">
              <ClipboardList size={21} />
            </span>
            <div>
              <h2>Pedidos chegando</h2>
              <p>
                Abra um pedido para ver os detalhes e atualizar o andamento.
              </p>
            </div>
          </div>
          <Link href="/pedidos" className="text-link">
            Ver todos
            <ArrowRight size={16} />
          </Link>
        </div>
        <OrdersLive />
      </section>
    </>
  );
}
