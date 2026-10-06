"use client";
import Link from "next/link";
import BrandIcon from "./brand-icon";
import BingoCredit from "./bingo-credit";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Bike,
  BookOpen,
  CircleDollarSign,
  ClipboardList,
  Home,
  Tag,
  Menu,
  MonitorSmartphone,
  Settings,
  Store,
  Table2,
  Users,
  X,
  MessageCircle,
  Shield,
  SunMoon,
  LogOut,
  Search,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/client";
import { useResource, ResourceState } from "./shared/resource";
import type { SessionView } from "@/lib/view-types";
import { can, type Permission } from "@/lib/security/permissions";
import { WorkspaceContext } from "./workspace-context";
import StoreAvailability from "./store-availability";
import ShareMenu from "./share-menu";
import Modal from "./shared/modal";
import { toast } from "sonner";
const groups: {
  title: string;
  items: [string, string, typeof Store, Permission][];
}[] = [
  {
    title: "DIA A DIA",
    items: [
      ["/painel", "Início", Home, "orders.read"],
      ["/pedidos", "Pedidos", ClipboardList, "orders.read"],
      ["/pdv", "Nova venda", MonitorSmartphone, "orders.write"],
      ["/cardapio", "Meu cardápio", BookOpen, "catalog"],
      ["/whatsapp", "Conversas", MessageCircle, "whatsapp"],
      ["/mesas", "Mesas", Table2, "orders.write"],
    ],
  },
  {
    title: "CUIDAR DO NEGÓCIO",
    items: [
      ["/clientes", "Clientes", Users, "customers"],
      ["/entregas", "Entregas", Bike, "orders.read"],
      ["/caixa", "Meu caixa", CircleDollarSign, "finance"],
      ["/relatorios", "Resultados", BarChart3, "finance"],
      ["/marketing", "Cupons e campanhas", Tag, "catalog"],
    ],
  },
  {
    title: "DO SEU JEITO",
    items: [
      ["/configuracoes", "Ajustes da loja", Settings, "settings"],
      ["/equipe", "Minha equipe", Shield, "audit"],
    ],
  },
];
export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [help, setHelp] = useState(false);
  const resource = useResource<SessionView>("/api/auth/me", 15000);
  useEffect(() => {
    if (resource.error?.status === 401) router.replace("/entrar");
  }, [resource.error, router]);
  useEffect(() => {
    const saved =
      localStorage.getItem("pede360_theme") ??
      localStorage.getItem("menuflow_theme");
    document.documentElement.dataset.theme =
      saved === "dark" ? "dark" : "light";
    const listener = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        requestAnimationFrame(() =>
          document.getElementById("nav-search")?.focus(),
        );
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  if (!resource.data)
    return <ResourceState {...resource} retry={resource.refresh} />;
  const user = resource.data;
  const store = user.merchant;
  const active = groups
    .flatMap((g) => g.items)
    .find(([href]) =>
      href === "/painel" ? pathname === "/painel" : pathname.startsWith(href),
    );
  const allowed = groups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        ([, label, , permission]) =>
          can(user.role, permission) &&
          label.toLowerCase().includes(search.toLowerCase()),
      ),
    }))
    .filter((g) => g.items.length);
  return (
    <WorkspaceContext.Provider value={{ user, refresh: resource.refresh }}>
      <div className="app-shell friendly-shell">
        <aside className={"sidebar " + (open ? "sidebar-open" : "")}>
          <Link className="brand" href="/painel">
            <span className="brand-mark">
              <BrandIcon size={44} />
            </span>
            <span>
              <b>
                PEDE<span className="brand-period">360</span>
              </b>
              <small>sua operação completa</small>
            </span>
          </Link>
          <button
            className="mobile-close sidebar-dismiss"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
          <label className="nav-search">
            <Search size={17} />
            <input
              id="nav-search"
              aria-label="Buscar no menu"
              placeholder="O que você procura?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <kbd>⌘ K</kbd>
          </label>
          <nav aria-label="Menu principal">
            {allowed.map((group) => (
              <div className="nav-group" key={group.title}>
                <span className="nav-group-label">{group.title}</span>
                {group.items.map(([href, label, Icon]) => (
                  <Link
                    key={href}
                    href={href}
                    className={
                      (
                        href === "/painel"
                          ? pathname === "/painel"
                          : pathname.startsWith(href)
                      )
                        ? "active"
                        : ""
                    }
                    aria-current={
                      (
                        href === "/painel"
                          ? pathname === "/painel"
                          : pathname.startsWith(href)
                      )
                        ? "page"
                        : undefined
                    }
                    onClick={() => setOpen(false)}
                  >
                    <Icon size={19} />
                    <span>{label}</span>
                    {(href === "/painel"
                      ? pathname === "/painel"
                      : pathname.startsWith(href)) && (
                      <span className="nav-active-dot" />
                    )}
                  </Link>
                ))}
              </div>
            ))}
            {!allowed.length && (
              <p className="nav-no-results">Nenhuma página encontrada.</p>
            )}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-mobile-tools">
              <button
                type="button"
                onClick={() => {
                  const theme =
                    document.documentElement.dataset.theme === "dark"
                      ? "light"
                      : "dark";
                  document.documentElement.dataset.theme = theme;
                  localStorage.setItem("pede360_theme", theme);
                }}
              >
                <SunMoon size={17} />
                Mudar tema
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api("/api/auth/me", { method: "DELETE" });
                    router.push("/entrar");
                    router.refresh();
                  } catch (error) {
                    toast.error((error as Error).message);
                  }
                }}
              >
                <LogOut size={17} />
                Sair
              </button>
            </div>
            <button
              className="sidebar-help"
              onClick={() => {
                setHelp(true);
                setOpen(false);
              }}
            >
              <HelpCircle size={20} />
              <span>
                Precisa de uma mão?<small>Veja como fazer</small>
              </span>
              <ChevronRight size={15} />
            </button>
            <Link className="user-card" href="/perfil">
              <span className="user-avatar">
                {user.imageUrl ? (
                  <img src={user.imageUrl} alt="" />
                ) : (
                  user.name.slice(0, 1)
                )}
              </span>
              <span>
                <b>{user.name}</b>
                <small>Minha conta</small>
              </span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </aside>
        <div className="main-wrap">
          <header className="topbar">
            <div className="topbar-location">
              <button
                className="mobile-menu"
                aria-label="Abrir menu"
                onClick={() => setOpen(true)}
              >
                <Menu size={22} />
              </button>
              <span className="top-store-icon">
                <Store size={19} />
              </span>
              <div>
                <b>{store.name}</b>
                <small>{active?.[1] || "Minha conta"}</small>
              </div>
            </div>
            <div className="top-actions">
              <StoreAvailability />
              <ShareMenu compact />
              <button
                className="icon-btn utility-button"
                title="Alternar tema"
                aria-label="Alternar tema"
                onClick={() => {
                  const theme =
                    document.documentElement.dataset.theme === "dark"
                      ? "light"
                      : "dark";
                  document.documentElement.dataset.theme = theme;
                  localStorage.setItem("pede360_theme", theme);
                }}
              >
                <SunMoon size={19} />
              </button>
              <button
                className="icon-btn utility-button"
                title="Sair da conta"
                aria-label="Sair"
                onClick={async () => {
                  try {
                    await api("/api/auth/me", { method: "DELETE" });
                    router.push("/entrar");
                    router.refresh();
                  } catch (error) {
                    toast.error((error as Error).message);
                  }
                }}
              >
                <LogOut size={18} />
              </button>
            </div>
          </header>
          <main className="content">
            {active?.[3] && !can(user.role, active[3]) ? (
              <div className="empty-state">
                <Shield size={30} />
                <h2>Esta área é para outro perfil</h2>
                <p>Peça ao responsável pela loja para ajustar seu acesso.</p>
              </div>
            ) : (
              children
            )}
          </main>
          <footer className="workspace-footer">
            <BingoCredit />
            <button onClick={() => setHelp(true)}>Como posso te ajudar?</button>
          </footer>
        </div>
        {open && (
          <button
            className="overlay"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          />
        )}
        {help && (
          <Modal
            title="Uma mão para o dia a dia"
            onClose={() => setHelp(false)}
          >
            <div className="help-top">
              <span className="bubble-icon">
                <MessageCircle size={26} />
              </span>
              <p>
                Escolha o que você quer fazer. Cada ajuste tem seu lugar, sem
                complicação.
              </p>
            </div>
            <div className="help-list">
              <details open>
                <summary>Como começo a receber pedidos?</summary>
                <p>
                  Cadastre seus produtos em Meu cardápio e toque em{" "}
                  <b>Abrir loja</b> no topo da tela. Compartilhe o link com seus
                  clientes.
                </p>
              </details>
              <details>
                <summary>Por que o botão de adicionar está bloqueado?</summary>
                <p>
                  Quando a loja está fechada, o cliente pode ver o cardápio, mas
                  não pode pedir. Use <b>Abrir loja</b> no topo e atualize o
                  cardápio.
                </p>
              </details>
              <details>
                <summary>Como troco fotos e preços?</summary>
                <p>
                  Em Meu cardápio, toque em <b>Editar produto</b>. Escolha uma
                  foto, ajuste o preço e salve.
                </p>
              </details>
              <details>
                <summary>Como recebo o pedido no WhatsApp?</summary>
                <p>
                  Em Ajustes da loja, abra <b>WhatsApp</b> e informe o número da
                  loja. Depois de concluir o pedido, o cliente pode enviar o
                  resumo para você.
                </p>
              </details>
              <details>
                <summary>Como altero entrega e pagamento?</summary>
                <p>
                  Em Ajustes da loja, escolha <b>Entregas</b> para definir
                  bairros e taxas ou <b>Pagamentos</b> para escolher as formas
                  aceitas.
                </p>
              </details>
            </div>
            <button className="primary-btn full" onClick={() => setHelp(false)}>
              Entendi, vamos lá
            </button>
          </Modal>
        )}
      </div>
    </WorkspaceContext.Provider>
  );
}
