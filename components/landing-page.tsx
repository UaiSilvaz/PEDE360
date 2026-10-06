"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  ShoppingBag,
  Smartphone,
  ClipboardList,
  Bike,
  BarChart3,
  MessageCircle,
  Monitor,
  Store,
  Plus,
  Menu,
  X,
  Wifi,
  BatteryFull,
  Signal,
  Clock3,
  Utensils,
  Pizza,
  Sandwich,
  Coffee,
  ShieldCheck,
  Search,
  MousePointer2,
} from "lucide-react";
import BrandIcon from "./brand-icon";
import BingoCredit from "./bingo-credit";
import BackgroundMusic from "./background-music";
const food = [
  {
    name: "Burger da casa",
    description: "Artesanal, queijo e muito sabor.",
    price: 29.9,
    image: "burger",
    category: "Burgers",
  },
  {
    name: "Pizza especial",
    description: "Massa fina, queijo e manjericão.",
    price: 49.9,
    image: "pizza",
    category: "Pizzas",
  },
  {
    name: "Batata crocante",
    description: "Douradinha. Perfeita para dividir.",
    price: 22,
    image: "fries",
    category: "Porções",
  },
];
const resources = [
  {
    icon: Smartphone,
    title: "Um cardápio que dá fome",
    text: "Fotos, categorias, adicionais e preços organizados. Seu cliente escolhe e faz o pedido em poucos toques.",
    label: "CARDÁPIO DIGITAL",
  },
  {
    icon: ClipboardList,
    title: "Cada pedido no seu lugar",
    text: "Acompanhe os pedidos, veja os detalhes e atualize o status. Do primeiro toque até a entrega.",
    label: "GESTÃO DE PEDIDOS",
  },
  {
    icon: Monitor,
    title: "O balcão também conectado",
    text: "Registre vendas no PDV e organize pedidos de mesa, retirada e delivery no mesmo sistema.",
    label: "PDV & MESAS",
  },
  {
    icon: MessageCircle,
    title: "Mais perto do seu cliente",
    text: "Compartilhe seu cardápio e facilite o envio do resumo do pedido pelo WhatsApp.",
    label: "WHATSAPP",
  },
  {
    icon: Bike,
    title: "Delivery do seu jeito",
    text: "Configure bairros, taxas de entrega e pedidos mínimos. Organize seus entregadores e retiradas.",
    label: "ENTREGAS",
  },
  {
    icon: BarChart3,
    title: "Decisões com mais clareza",
    text: "Consulte resultados, produtos vendidos e clientes. Acompanhe o caixa e os movimentos da sua operação.",
    label: "RESULTADOS & CAIXA",
  },
];
const questions = [
  [
    "O que é o PEDE360?",
    "É um sistema que reúne cardápio digital, pedidos, PDV, mesas, delivery e gestão da loja. Você cuida da operação em um único painel.",
  ],
  [
    "Meu cliente precisa baixar um aplicativo?",
    "Não. O cardápio abre direto no navegador do celular pelo link da sua loja. O cliente pode escolher produtos e concluir o pedido por ali.",
  ],
  [
    "Posso usar no celular e no computador?",
    "Sim. O painel e o cardápio se adaptam a celulares, tablets e computadores. Basta acessar pelo navegador.",
  ],
  [
    "Como funciona o WhatsApp?",
    "Você configura o número da sua loja para o cliente enviar o resumo do pedido. A integração oficial da Meta também está disponível e requer configuração própria.",
  ],
  [
    "Como são feitos os pagamentos?",
    "Você define as formas de pagamento aceitas e combina o pagamento na entrega ou retirada. O sistema não realiza cobrança online ou Pix automático.",
  ],
  [
    "Como começo a usar?",
    "Crie sua conta, cadastre produtos e configure sua loja. Depois, abra a loja para pedidos e compartilhe o link do seu cardápio.",
  ],
];
function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="lp-logo" aria-label="PEDE360">
      <span>PEDE</span>
      <BrandIcon size={52} light={light} />
    </span>
  );
}
export default function LandingPage() {
  const [mobile, setMobile] = useState(false);
  const [category, setCategory] = useState("Todos");
  const [cart, setCart] = useState<number[]>([]);
  const total = cart.reduce((sum, index) => sum + food[index].price, 0);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.12 },
    );
    document
      .querySelectorAll(".lp-reveal")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return (
    <div className="lp" id="top">
      <BackgroundMusic />
      <header className="lp-header">
        <div className="lp-container lp-nav">
          <Link href="/" aria-label="PEDE360 início">
            <Logo />
          </Link>
          <nav
            className={mobile ? "lp-links is-open" : "lp-links"}
            aria-label="Navegação da apresentação"
          >
            {[
              ["#recursos", "Recursos"],
              ["#whatsapp", "WhatsApp"],
              ["#como-funciona", "Como funciona"],
              ["#demonstracao", "Cardápio digital"],
              ["#duvidas", "Dúvidas"],
            ].map(([href, text]) => (
              <a key={href} href={href} onClick={() => setMobile(false)}>
                {text}
              </a>
            ))}
          </nav>
          <div className="lp-nav-actions">
            <Link href="/entrar" className="lp-login">
              Entrar <ArrowUpRight size={15} />
            </Link>
            <Link href="/cadastro" className="lp-button lp-button-small">
              Começar agora <ArrowRight size={16} />
            </Link>
            <button
              className="lp-mobile-toggle"
              onClick={() => setMobile(!mobile)}
              aria-label={mobile ? "Fechar navegação" : "Abrir navegação"}
              aria-expanded={mobile}
            >
              {mobile ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main>
        <section className="lp-hero">
          <div className="lp-container lp-hero-grid">
            <div className="lp-hero-copy">
              <h1>
                <span className="lp-title-first">Seu cardápio</span>
                <span className="lp-title-digital">DIGITAL</span>
              </h1>
              <p>
                Bonito de ver. Fácil de pedir.
                <br />
                Sua loja na palma da mão do seu cliente.
              </p>
              <div className="lp-hero-actions">
                <Link href="/cadastro" className="lp-button">
                  Criar meu cardápio <ArrowUpRight size={20} />
                </Link>
                <Link href="/loja/demo" className="lp-text-link">
                  Ver demonstração <ArrowUpRight size={16} />
                </Link>
              </div>
            </div>
            <div className="lp-hero-visual lp-hand-visual">
              <div className="lp-hand-glow" aria-hidden="true" />
              <div className="lp-hand-stage">
                <img
                  className="lp-hand-photo"
                  src="/landing/phone-hand.png"
                  alt="Mão segurando um celular com o cardápio digital PEDE360"
                />
                <div className="lp-phone">
                  <div className="lp-phone-screen">
                    <div className="lp-phone-status">
                      <b>9:41</b>
                      <span>
                        <Signal size={12} />
                        <Wifi size={12} />
                        <BatteryFull size={17} />
                      </span>
                    </div>
                    <div className="lp-island" />
                    <div className="lp-phone-cover">
                      <img
                        src="/landing/burger.jpg"
                        alt="Hambúrguer artesanal com queijo e salada"
                      />
                      <span>
                        Feito com sabor.
                        <br />
                        Pedido com facilidade.
                      </span>
                    </div>
                    <div className="lp-phone-store">
                      <span className="lp-shop-avatar">
                        <Utensils size={20} />
                      </span>
                      <div>
                        <b>360 Burger</b>
                        <small>
                          <i /> Aberto agora · 30–45 min
                        </small>
                      </div>
                      <span className="lp-rating">★ 4.9</span>
                    </div>
                    <div className="lp-phone-search">
                      <Search size={14} /> O que vai matar sua fome?
                    </div>
                    <div className="lp-phone-tabs">
                      {["Todos", "Burgers", "Pizzas", "Porções"].map((c) => (
                        <button
                          key={c}
                          onClick={() => setCategory(c)}
                          className={category === c ? "selected" : ""}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    <div className="lp-phone-food">
                      <b className="lp-food-title">
                        {category === "Todos"
                          ? "Os favoritos da casa"
                          : category}{" "}
                        <span>❤</span>
                      </b>
                      {food.map(
                        (item, index) =>
                          (category === "Todos" ||
                            category === item.category) && (
                            <div className="lp-food-item" key={item.name}>
                              <div>
                                <b>{item.name}</b>
                                <p>{item.description}</p>
                                <strong>
                                  {item.price.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })}
                                </strong>
                              </div>
                              <div className="lp-food-picture">
                                <img
                                  src={`/landing/${item.image}.jpg`}
                                  alt={item.name}
                                />
                                <button
                                  onClick={() => setCart([...cart, index])}
                                  aria-label={`Adicionar ${item.name}`}
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                            </div>
                          ),
                      )}
                    </div>
                    <button
                      className="lp-phone-cart"
                      onClick={() =>
                        document
                          .getElementById("demonstracao")
                          ?.scrollIntoView({ behavior: "smooth" })
                      }
                    >
                      <span>
                        <ShoppingBag size={16} />{" "}
                        {cart.length
                          ? `${cart.length} ${cart.length === 1 ? "item" : "itens"}`
                          : "Seu pedido"}
                      </span>
                      <b>
                        {total
                          ? total.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })
                          : "Experimentar →"}
                      </b>
                    </button>
                    <span className="lp-phone-home" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="lp-container lp-hero-bottom">
            <span>SEU CLIENTE ESCOLHE. VOCÊ RECEBE O PEDIDO.</span>
            <a href="#recursos" aria-label="Explorar recursos">
              <ChevronDown size={21} />
            </a>
          </div>
        </section>
        <div className="lp-category-band">
          <div className="lp-container">
            <span>
              <Utensils /> Restaurantes
            </span>
            <span>✦</span>
            <span>
              <Pizza aria-hidden="true" /> Pizzarias
            </span>
            <span>✦</span>
            <span>
              <Sandwich aria-hidden="true" /> Hamburguerias
            </span>
            <span>✦</span>
            <span>
              <Coffee aria-hidden="true" /> Cafeterias
            </span>
            <span>✦</span>
            <span>
              <Bike aria-hidden="true" /> Delivery
            </span>
          </div>
        </div>
        <section className="lp-whatsapp lp-section" id="whatsapp">
          <div className="lp-container lp-whatsapp-grid">
            <div className="lp-whatsapp-copy lp-reveal">
              <span className="lp-kicker">DO CARDÁPIO PARA A CONVERSA</span>
              <h2>
                Venda pelo
                <br />
                <span>WhatsApp.</span>
              </h2>
              <p>
                Compartilhe seu link. Seu cliente escolhe os produtos e envia o
                resumo do pedido para o WhatsApp da sua loja. Mais fácil para
                pedir. Mais simples para atender.
              </p>
              <Link href="/cadastro" className="lp-button">
                Quero vender pelo WhatsApp <ArrowUpRight size={20} />
              </Link>
            </div>
            <div className="lp-chat-demo lp-reveal">
              <div className="lp-chat-header">
                <span>
                  <BrandIcon size={48} />
                </span>
                <div>
                  <b>360 Burger</b>
                  <small>Seu atendimento, mais perto</small>
                </div>
                <MessageCircle size={24} />
              </div>
              <div className="lp-chat-body">
                <span className="lp-chat-day">EXEMPLO DE PEDIDO</span>
                <div className="lp-chat-bubble">
                  <img src="/landing/burger.jpg" alt="Burger da casa" />
                  <b>Olá! Quero fazer um pedido 🍔</b>
                  <p>
                    1× Burger da casa
                    <br />
                    1× Batata crocante
                  </p>
                  <span>Retirada na loja</span>
                  <strong>Total: R$ 51,90</strong>
                  <small>
                    12:30 <CheckCheck size={15} />
                  </small>
                </div>
                <div className="lp-chat-reply">
                  Tudo certo! Vamos preparar seu pedido.
                  <span>
                    12:31 <CheckCheck size={14} />
                  </span>
                </div>
              </div>
              <div className="lp-chat-footer">
                <ShieldCheck size={16} /> O cliente confirma o envio pelo
                WhatsApp.
              </div>
            </div>
          </div>
        </section>
        <section className="lp-section" id="recursos">
          <div className="lp-container">
            <div className="lp-section-head lp-reveal">
              <div>
                <span className="lp-kicker">GESTÃO COMPLETA, DO SEU JEITO</span>
                <h2>
                  Seu dia já tem muita coisa.
                  <br />
                  <span>A gestão pode ser simples.</span>
                </h2>
              </div>
              <p>
                Ferramentas que conversam entre si para você cuidar do que faz
                melhor: seu negócio.
              </p>
            </div>
            <div className="lp-resource-grid">
              {resources.map((r, i) => (
                <article className="lp-resource-card lp-reveal" key={r.title}>
                  <div className="lp-resource-top">
                    <span>
                      <r.icon size={25} />
                    </span>
                    <small>0{i + 1}</small>
                  </div>
                  <span className="lp-resource-label">{r.label}</span>
                  <h3>{r.title}</h3>
                  <p>{r.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="lp-demo lp-section" id="demonstracao">
          <div className="lp-container lp-demo-grid">
            <div className="lp-demo-art lp-reveal">
              <div className="lp-demo-photo">
                <img
                  src="/landing/restaurant.jpg"
                  alt="Restaurante com ambiente acolhedor e mesas preparadas"
                />
                <div>
                  <span>BOA COMIDA. BOA EXPERIÊNCIA.</span>
                  <b>
                    O cuidado começa
                    <br />
                    antes da primeira mordida.
                  </b>
                </div>
              </div>
              <div className="lp-demo-product">
                <img src="/landing/pizza.jpg" alt="Pizza artesanal" />
                <div>
                  <small>VONTADE DE PEDIR?</small>
                  <b>Seu cardápio está a um toque.</b>
                  <Link href="/loja/demo">
                    Explorar cardápio <ArrowUpRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
            <div className="lp-demo-copy lp-reveal">
              <span className="lp-kicker">
                DO LINK AO PEDIDO, SEM COMPLICAÇÃO
              </span>
              <h2>
                Um cardápio bonito.
                <br />
                <span>
                  Uma experiência
                  <br />
                  ainda melhor.
                </span>
              </h2>
              <p>
                Seu cliente abre o link, encontra o que procura e faz o pedido.
                Você recebe tudo organizado, sem precisar decifrar mensagens.
              </p>
              <ul>
                <li>
                  <Check /> Fotos e descrições que valorizam seus produtos
                </li>
                <li>
                  <Check /> Adicionais, observações e opções de retirada
                </li>
                <li>
                  <Check /> Sua marca, seus preços e seu jeito de atender
                </li>
              </ul>
              <Link href="/loja/demo" className="lp-button">
                Experimentar o cardápio <ArrowUpRight size={20} />
              </Link>
              <small className="lp-demo-note">
                Explore a loja demonstrativa e conheça a experiência.
              </small>
            </div>
          </div>
        </section>
        <section className="lp-section lp-steps" id="como-funciona">
          <div className="lp-container">
            <div className="lp-centered lp-reveal">
              <span className="lp-kicker">DO ZERO AO PRIMEIRO PEDIDO</span>
              <h2>
                Seu novo jeito de trabalhar.
                <br />
                <span>Em três passos.</span>
              </h2>
            </div>
            <div className="lp-steps-grid">
              {[
                {
                  icon: Store,
                  title: "Dê a sua cara",
                  text: "Crie sua conta e configure a identidade, as entregas e os pagamentos da loja.",
                },
                {
                  icon: Smartphone,
                  title: "Monte seu cardápio",
                  text: "Adicione produtos, fotos, preços e opções. Deixe tudo pronto para abrir o apetite.",
                },
                {
                  icon: MousePointer2,
                  title: "Compartilhe. Receba.",
                  text: "Abra a loja, compartilhe o link e acompanhe os pedidos pelo seu painel.",
                },
              ].map((step, i) => (
                <article key={step.title} className="lp-step lp-reveal">
                  <div className="lp-step-line">
                    <span>0{i + 1}</span>
                    <step.icon size={28} />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="lp-control">
          <div className="lp-container lp-control-grid">
            <div className="lp-reveal">
              <span className="lp-kicker">MAIS VISÃO. MENOS CORRERIA.</span>
              <h2>
                Você no comando.
                <br />
                <span>
                  Sua operação
                  <br />
                  em sintonia.
                </span>
              </h2>
              <p>
                Pedidos, equipe e resultados em um painel que acompanha o ritmo
                da sua loja. No computador, no tablet ou no celular.
              </p>
              <Link href="/cadastro" className="lp-button">
                Conhecer o PEDE360 <ArrowUpRight size={20} />
              </Link>
              <span className="lp-control-foot">
                <ShieldCheck size={17} /> Acesso por perfil para sua equipe
              </span>
            </div>
            <div className="lp-dashboard lp-reveal">
              <div className="lp-dash-top">
                <Logo />
                <span>
                  <i /> Loja aberta
                </span>
              </div>
              <div className="lp-dash-heading">
                <div>
                  <small>VISÃO DA OPERAÇÃO · EXEMPLO</small>
                  <h3>Tudo no seu lugar.</h3>
                </div>
                <span>
                  Hoje <ChevronDown size={13} />
                </span>
              </div>
              <div className="lp-dash-stats">
                <div>
                  <ShoppingBag size={17} />
                  <small>Pedidos</small>
                  <b>24</b>
                </div>
                <div>
                  <BarChart3 size={17} />
                  <small>Vendas</small>
                  <b>
                    R$ 892<span>,00</span>
                  </b>
                </div>
                <div>
                  <Clock3 size={17} />
                  <small>Em preparo</small>
                  <b>06</b>
                </div>
              </div>
              <div className="lp-dash-orders">
                <span>
                  Últimos pedidos <b>Ver todos ↗</b>
                </span>
                {[
                  ["#024", "Ana Oliveira", "2× Burger da casa", "Em preparo"],
                  [
                    "#023",
                    "Pedro Santos",
                    "1× Pizza especial",
                    "Saiu para entrega",
                  ],
                  ["#022", "Julia Costa", "1× Burger + batata", "Concluído"],
                ].map(([id, name, item, status], i) => (
                  <div className="lp-dash-row" key={id}>
                    <span className="lp-dash-avatar">{name.slice(0, 1)}</span>
                    <div>
                      <b>
                        {name} <small>{id}</small>
                      </b>
                      <small>{item}</small>
                    </div>
                    <span className={`lp-dash-status status-${i}`}>
                      {status}
                    </span>
                  </div>
                ))}
              </div>
              <div className="lp-dash-bottom">
                <CheckCheck size={17} /> Sua equipe conectada ao próximo pedido.
              </div>
            </div>
          </div>
        </section>
        <section className="lp-section lp-faq" id="duvidas">
          <div className="lp-container lp-faq-grid">
            <div className="lp-reveal">
              <span className="lp-kicker">VAMOS DESCOMPLICAR?</span>
              <h2>
                Boas perguntas.
                <br />
                <span>Respostas simples.</span>
              </h2>
              <p>
                Entenda como o PEDE360 pode fazer parte do dia a dia da sua
                loja.
              </p>
              <span className="lp-faq-symbol">
                <MessageCircle size={56} />
                <Plus size={24} />
              </span>
            </div>
            <div className="lp-faq-list lp-reveal">
              {questions.map(([q, a]) => (
                <details key={q}>
                  <summary>
                    {q}
                    <Plus size={19} />
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <section className="lp-final">
          <div className="lp-container lp-final-inner lp-reveal">
            <div className="lp-final-orbit" />
            <Logo light />
            <span className="lp-kicker">
              SEU NEGÓCIO MERECE ESSE PRÓXIMO PASSO
            </span>
            <h2>
              Mais organização.
              <br />
              Mais tempo para <em>crescer.</em>
            </h2>
            <p>
              Traga sua loja para o PEDE360 e transforme seu jeito de receber
              pedidos.
            </p>
            <Link href="/cadastro" className="lp-button">
              Começar com o PEDE360 <ArrowUpRight size={21} />
            </Link>
            <span className="lp-final-note">
              Seu cardápio. Seus pedidos. Sua operação completa.
            </span>
          </div>
        </section>
      </main>
      <footer className="lp-footer">
        <div className="lp-container">
          <div>
            <Link href="#top">
              <Logo />
            </Link>
            <p>Seu negócio, mais leve. Sua operação, completa.</p>
          </div>
          <nav aria-label="Links do rodapé">
            <a href="#recursos">Recursos</a>
            <a href="#duvidas">Dúvidas</a>
            <Link href="/entrar">
              Entrar no sistema <ArrowUpRight size={14} />
            </Link>
          </nav>
        </div>
        <div className="lp-container lp-footer-bottom">
          <span>
            © {new Date().getFullYear()} PEDE360. Todos os direitos reservados.
          </span>
          <BingoCredit />
        </div>
      </footer>
    </div>
  );
}
