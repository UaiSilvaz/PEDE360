"use client";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Search, ShoppingBag, Plus, Minus } from "lucide-react";
import { api, money } from "@/lib/client";
import { orderSchema, type OrderInput } from "@/lib/schemas/order";
import type { Store, CatalogProduct } from "@/lib/view-types";
import Modal from "./shared/modal";
import { menuStyle } from "@/lib/menu-appearance";
type CartItem = {
  key: string;
  product: CatalogProduct;
  quantity: number;
  optionIds: string[];
  notes: string;
};
type Quote = {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
};
function itemPrice(item: CartItem) {
  return (
    Number(item.product.price) +
    item.product.optionGroups
      .flatMap((g) => g.options)
      .filter((o) => item.optionIds.includes(o.id))
      .reduce((s, o) => s + Number(o.price), 0)
  );
}
function ProductChoices({
  product,
  onAdd,
}: {
  product: CatalogProduct;
  onAdd: (optionIds: string[], notes: string) => void;
}) {
  const [ids, setIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  return (
    <div className="stack">
      {product.imageUrl && (
        <img
          className="product-detail-image"
          src={product.imageUrl}
          alt={product.name}
        />
      )}
      <p>{product.description}</p>
      {product.optionGroups.map((g) => (
        <fieldset className="option-editor" key={g.id}>
          <legend>
            {g.name} · {g.required ? "obrigatório" : "opcional"} ·{" "}
            {Math.max(g.min, g.required ? 1 : 0)} a {g.max}
          </legend>
          {g.options.map((o) => (
            <label className="option-choice" key={o.id}>
              <input
                type="checkbox"
                checked={ids.includes(o.id)}
                onChange={(e) => {
                  setError("");
                  if (!e.target.checked)
                    setIds(ids.filter((id) => id !== o.id));
                  else if (g.max === 1)
                    setIds([
                      ...ids.filter(
                        (id) => !g.options.some((x) => x.id === id),
                      ),
                      o.id,
                    ]);
                  else if (
                    g.options.filter((x) => ids.includes(x.id)).length < g.max
                  )
                    setIds([...ids, o.id]);
                  else setError("Escolha no máximo " + g.max + " em " + g.name);
                }}
              />
              <span>{o.name}</span>
              <strong>+ {money(o.price)}</strong>
            </label>
          ))}
        </fieldset>
      ))}
      <label>
        Observações do item
        <textarea
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Como você prefere este item?"
        />
      </label>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="primary-btn full"
        onClick={() => {
          for (const g of product.optionGroups) {
            const n = g.options.filter((o) => ids.includes(o.id)).length;
            if (n < Math.max(g.min, g.required ? 1 : 0) || n > g.max) {
              setError("Confira suas escolhas em " + g.name);
              return;
            }
          }
          onAdd(ids, notes);
        }}
      >
        Adicionar ·{" "}
        {money(
          Number(product.price) +
            product.optionGroups
              .flatMap((g) => g.options)
              .filter((o) => ids.includes(o.id))
              .reduce((s, o) => s + Number(o.price), 0),
        )}
      </button>
    </div>
  );
}
function Checkout({
  items,
  store,
  admin,
  conversationId,
  onDone,
}: {
  items: CartItem[];
  store: Store;
  admin: boolean;
  conversationId?: string;
  onDone: () => void;
}) {
  const [step, setStep] = useState(1);
  const [review, setReview] = useState<{ input: OrderInput; quote: Quote }>();
  const [result, setResult] = useState<{
    code: number;
    total: number;
    whatsappUrl?: string;
  }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<z.input<typeof orderSchema>, unknown, OrderInput>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      idempotencyKey: crypto.randomUUID(),
      type: "PICKUP",
      paymentMethod: store.paymentMethods[0] as OrderInput["paymentMethod"],
      name: "",
      phone: "",
      street: "",
      number: "",
      neighborhood: "",
      complement: "",
      reference: "",
      notes: "",
      coupon: "",
      whatsappConsent: false,
      conversationId,
      items: items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        optionIds: i.optionIds,
        notes: i.notes,
      })),
    },
  });
  const type = useWatch({ control, name: "type" });
  const payment = useWatch({ control, name: "paymentMethod" });
  const endpoint = admin
    ? "/api/orders"
    : "/api/store/" + store.slug + "/orders";
  const quote = handleSubmit(async (input) => {
    setBusy(true);
    setError("");
    try {
      const quote = await api<Quote>(endpoint + "?quote=true", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setReview({ input, quote });
      setStep(4);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  });
  async function confirmOrder() {
    if (!review || busy) return;
    setBusy(true);
    try {
      const receipt = await api<{
        code: number;
        total: number;
        whatsappUrl?: string;
      }>(endpoint, { method: "POST", body: JSON.stringify(review.input) });
      setResult(receipt);
      toast.success("Pedido #" + receipt.code + " recebido.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <div className="empty-state">
        <span className="badge badge-green">Pedido recebido</span>
        <h2>Pedido #{result.code}</h2>
        <p>Total confirmado: {money(result.total)}</p>
        <p>
          O pagamento será combinado com o estabelecimento pela forma escolhida.
        </p>
        {result.whatsappUrl && (
          <a
            className="primary-btn"
            href={result.whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            Enviar pedido pelo WhatsApp
          </a>
        )}
        <button className="outline-btn" onClick={onDone}>
          Concluir
        </button>
      </div>
    );
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (step === 3) void quote();
        else if (step === 4) void confirmOrder();
        else setStep(step + 1);
      }}
    >
      <div className="checkout-steps">
        {["Identificação", "Entrega ou retirada", "Pagamento", "Revisão"].map(
          (name, i) => (
            <span className={step === i + 1 ? "active" : ""} key={name}>
              {i + 1}. {name}
            </span>
          ),
        )}
      </div>
      <div className="form-grid" hidden={step !== 1}>
        <label>
          Nome
          <input required {...register("name")} />
        </label>
        <label>
          Telefone / WhatsApp
          <input
            required
            type="tel"
            placeholder="5517999999999"
            {...register("phone")}
          />
        </label>
        <label>
          CPF (opcional)
          <input inputMode="numeric" maxLength={11} {...register("cpf")} />
        </label>
        <label className="span-2 check-label">
          <input type="checkbox" {...register("whatsappConsent")} /> Aceito
          receber atualizações deste pedido pelo WhatsApp.
        </label>
      </div>
      <div className="form-grid" hidden={step !== 2}>
        <label>
          Como receber
          <select {...register("type")}>
            <option value="PICKUP">Retirada</option>
            <option value="DELIVERY">Entrega</option>
            {admin && (
              <>
                <option value="TABLE">Mesa</option>
                <option value="SCHEDULED">Retirada agendada</option>
              </>
            )}
          </select>
        </label>
        {type === "DELIVERY" && (
          <>
            <label>
              Região de entrega
              <select {...register("deliveryZoneId")}>
                <option value="">Selecione</option>
                {store.deliveryZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} · {money(z.fee)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Rua
              <input {...register("street")} />
            </label>
            <label>
              Número
              <input {...register("number")} />
            </label>
            <label>
              Bairro
              <input {...register("neighborhood")} />
            </label>
            <label>
              Complemento
              <input {...register("complement")} />
            </label>
            <label>
              Referência
              <input {...register("reference")} />
            </label>
          </>
        )}
        {type === "TABLE" && (
          <label>
            Mesa
            <input {...register("tableNumber")} />
          </label>
        )}
        {type === "SCHEDULED" && (
          <label>
            Retirada em
            <input
              type="datetime-local"
              {...register("scheduledAt", {
                setValueAs: (v) => (v ? new Date(v).toISOString() : undefined),
              })}
            />
          </label>
        )}
        {type === "PICKUP" && (
          <p>{store.address || "Retirada no estabelecimento."}</p>
        )}
      </div>
      <div className="form-grid" hidden={step !== 3}>
        <label>
          Forma de pagamento
          <select {...register("paymentMethod")}>
            {store.paymentMethods.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        {payment === "Dinheiro" && (
          <label>
            Troco para (opcional)
            <input
              type="number"
              min="0"
              step=".01"
              {...register("cashChangeFor", {
                setValueAs: (v) => (v === "" ? undefined : Number(v)),
              })}
            />
          </label>
        )}
        <label>
          Cupom
          <input {...register("coupon")} />
        </label>
        <label className="span-2">
          Observações
          <textarea {...register("notes")} />
        </label>
        <p className="muted span-2">
          Pagamento na entrega ou retirada. Esta etapa não cobra cartão nem gera
          Pix.
        </p>
      </div>
      {step === 4 && review && (
        <div>
          <h3>Confira seu pedido</h3>
          {items.map((i) => (
            <p key={i.key}>
              {i.quantity}x {i.product.name} ·{" "}
              {money(itemPrice(i) * i.quantity)}
            </p>
          ))}
          <p>
            {review.input.name} · {review.input.phone}
          </p>
          <p>
            {review.input.type === "DELIVERY"
              ? review.input.street +
                ", " +
                review.input.number +
                " — " +
                review.input.neighborhood
              : "Retirada / atendimento no estabelecimento"}
          </p>
          <p>Pagamento: {review.input.paymentMethod}</p>
          <div className="totals">
            <div>
              <span>Subtotal</span>
              <b>{money(review.quote.subtotal)}</b>
            </div>
            <div>
              <span>Entrega</span>
              <b>{money(review.quote.deliveryFee)}</b>
            </div>
            <div>
              <span>Desconto</span>
              <b>{money(review.quote.discount)}</b>
            </div>
            <div className="grand">
              <span>Total</span>
              <b>{money(review.quote.total)}</b>
            </div>
          </div>
        </div>
      )}
      {Object.keys(errors).length > 0 && (
        <p className="field-error" role="alert">
          {Object.values(errors)
            .map((e) => e?.message)
            .filter(Boolean)
            .join(" · ") || "Confira os dados nas etapas anteriores."}
        </p>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="inline-actions">
        {step > 1 && (
          <button
            className="outline-btn"
            type="button"
            disabled={busy}
            onClick={() => {
              setStep(step - 1);
              setReview(undefined);
              setError("");
            }}
          >
            Voltar
          </button>
        )}
        <button className="primary-btn" disabled={busy}>
          {busy
            ? "Aguarde…"
            : step === 4
              ? "Confirmar pedido"
              : step === 3
                ? "Revisar pedido"
                : "Continuar"}
        </button>
      </div>
    </form>
  );
}
export default function Storefront({
  store,
  admin = false,
  conversationId,
}: {
  store: Store;
  admin?: boolean;
  conversationId?: string;
}) {
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selected, setSelected] = useState<CatalogProduct>();
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const list = store.products.filter(
    (p) =>
      (!category || p.categoryId === category) &&
      (p.name + " " + p.description)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const count = cart.reduce((n, i) => n + i.quantity, 0);
  const total = cart.reduce((n, i) => n + itemPrice(i) * i.quantity, 0);
  function add(product: CatalogProduct, optionIds: string[], notes: string) {
    const key = JSON.stringify([product.id, [...optionIds].sort(), notes]);
    setCart((items) => {
      const existing = items.find((i) => i.key === key);
      return existing
        ? items.map((i) =>
            i.key === key
              ? { ...i, quantity: Math.min(99, i.quantity + 1) }
              : i,
          )
        : [...items, { key, product, optionIds, notes, quantity: 1 }];
    });
    setSelected(undefined);
    toast.success("Item adicionado.");
  }
  function quantity(key: string, delta: number) {
    setCart((items) =>
      items
        .map((i) =>
          i.key === key
            ? { ...i, quantity: Math.min(99, i.quantity + delta) }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }
  return (
    <div
      className={admin ? "pos-store" : "storefront custom-menu"}
      style={
        admin ? undefined : menuStyle(store.appearance, store.primaryColor)
      }
    >
      {!admin && (
        <>
          <div className="store-cover">
            {store.coverUrl && (
              <img src={store.coverUrl} alt={"Capa de " + store.name} />
            )}
            <span className="store-cover-label">
              PEDE360 · PEÇA DO SEU JEITO
            </span>
          </div>
          <section className="store-profile">
            <div className="store-logo">
              {store.logoUrl ? (
                <img src={store.logoUrl} alt={"Logo de " + store.name} />
              ) : (
                <img src="/brand/PEDE360.png" alt="PEDE360" />
              )}
            </div>
            <div>
              <h1>{store.name}</h1>
              <p>{store.description}</p>
              <div className="store-meta">
                <span className={store.isOpen ? "open-pill" : "closed-pill"}>
                  {store.isOpen ? "Aberto agora" : "Fechado"}
                </span>
                <span>{store.estimatedTime}</span>
                <span>Entrega mín. {money(store.deliveryMinimum || 0)}</span>
              </div>
            </div>
          </section>
          {!store.isOpen && (
            <div
              id="store-closed-notice"
              className="store-closed-notice"
              role="status"
            >
              <strong>Loja fechada no momento</strong>
              <p>
                Você pode consultar o cardápio. Os botões de adicionar serão
                liberados quando a loja abrir para pedidos.
              </p>
            </div>
          )}
        </>
      )}
      <div className="store-search">
        <Search size={18} />
        <input
          aria-label="Buscar no cardápio"
          placeholder="Encontre seu próximo favorito"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="store-cats">
        <button
          className={!category ? "active" : ""}
          onClick={() => setCategory("")}
        >
          Todos
        </button>
        {store.categories.map((c) => (
          <button
            key={c.id}
            className={category === c.id ? "active" : ""}
            onClick={() => setCategory(c.id)}
          >
            {c.imageUrl && (
              <img src={c.imageUrl} alt="" width={22} height={22} />
            )}{" "}
            {c.name}
          </button>
        ))}
      </div>
      <main className="store-products">
        {!category && !query && store.products.some((p) => p.featured) && (
          <section>
            <h2>Escolhas da casa</h2>
            <div className="featured-scroll">
              {store.products
                .filter((p) => p.featured)
                .map((p) => (
                  <button
                    className="featured-card"
                    key={p.id}
                    disabled={!store.isOpen && !admin}
                    title={
                      !store.isOpen && !admin
                        ? "Loja fechada: pedidos indisponíveis no momento"
                        : undefined
                    }
                    aria-describedby={
                      !store.isOpen && !admin
                        ? "store-closed-notice"
                        : undefined
                    }
                    onClick={() => setSelected(p)}
                  >
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} />
                    ) : (
                      <span className="image-placeholder">PEDE360</span>
                    )}
                    <b>{p.name}</b>
                    <strong>{money(p.price)}</strong>
                  </button>
                ))}
            </div>
          </section>
        )}
        <section>
          <h2>
            {category
              ? store.categories.find((c) => c.id === category)?.name
              : "Feito para você"}
          </h2>
          <div className="store-product-list">
            {list.map((p) => (
              <article key={p.id}>
                <div>
                  <h3>{p.name}</h3>
                  <p>{p.description}</p>
                  <strong>{money(p.price)}</strong>
                  {p.optionGroups.length > 0 && (
                    <small>Personalize seu pedido</small>
                  )}
                </div>
                <button
                  className="product-photo"
                  aria-label={"Adicionar " + p.name}
                  disabled={!store.isOpen && !admin}
                  title={
                    !store.isOpen && !admin
                      ? "Loja fechada: pedidos indisponíveis no momento"
                      : undefined
                  }
                  aria-describedby={
                    !store.isOpen && !admin ? "store-closed-notice" : undefined
                  }
                  onClick={() => setSelected(p)}
                >
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} />
                  ) : (
                    <span className="image-placeholder">M</span>
                  )}
                  <i>
                    <Plus size={17} />
                  </i>
                </button>
              </article>
            ))}
          </div>
          {!list.length && (
            <p className="empty-state">Nenhum produto encontrado.</p>
          )}
        </section>
      </main>
      {count > 0 && (
        <button
          className="floating-cart"
          onClick={() => {
            setCheckout(false);
            setCartOpen(true);
          }}
        >
          <span>
            <ShoppingBag size={18} />
            <b>{count} itens</b>
          </span>
          <strong>{money(total)} · Ver pedido</strong>
        </button>
      )}
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(undefined)}>
          <ProductChoices
            product={selected}
            onAdd={(ids, notes) => add(selected, ids, notes)}
          />
        </Modal>
      )}
      {cartOpen && (
        <Modal
          title={checkout ? "Finalizar pedido" : "Seu carrinho"}
          onClose={() => {
            setCartOpen(false);
            setCheckout(false);
          }}
        >
          {checkout ? (
            <Checkout
              store={store}
              admin={admin}
              conversationId={conversationId}
              items={cart}
              onDone={() => {
                setCart([]);
                setCartOpen(false);
                setCheckout(false);
              }}
            />
          ) : (
            <div className="stack">
              {cart.map((i) => (
                <div className="cart-line" key={i.key}>
                  <div>
                    <b>{i.product.name}</b>
                    <small>
                      {i.product.optionGroups
                        .flatMap((g) => g.options)
                        .filter((o) => i.optionIds.includes(o.id))
                        .map((o) => o.name)
                        .join(", ")}
                    </small>
                    <small>{i.notes}</small>
                    <strong>{money(itemPrice(i) * i.quantity)}</strong>
                  </div>
                  <div className="qty">
                    <button
                      aria-label="Diminuir quantidade"
                      onClick={() => quantity(i.key, -1)}
                    >
                      <Minus size={14} />
                    </button>
                    <span>{i.quantity}</span>
                    <button
                      aria-label="Aumentar quantidade"
                      onClick={() => quantity(i.key, 1)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {!cart.length && <p>Carrinho vazio.</p>}
              <div className="grand">
                <span>Subtotal</span>
                <b>{money(total)}</b>
              </div>
              <button
                className="primary-btn"
                disabled={!cart.length}
                onClick={() => setCheckout(true)}
              >
                Continuar para identificação
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
