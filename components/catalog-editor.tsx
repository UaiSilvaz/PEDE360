"use client";
import { useState } from "react";
import Link from "next/link";
import { Palette } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { productSchema } from "@/lib/schemas/catalog";
import { api, money } from "@/lib/client";
import { toast } from "sonner";
import type { CatalogProduct, Category, ImageValue } from "@/lib/view-types";
import { useResource, ResourceState } from "./shared/resource";
import Modal from "./shared/modal";
import ImageUpload from "./shared/image-upload";
type Catalog = { products: CatalogProduct[]; categories: Category[] };
type ProductInput = z.input<typeof productSchema>;
type Group = z.output<typeof productSchema>["optionGroups"][number];
function ProductForm({
  product,
  categories,
  onSaved,
}: {
  product?: CatalogProduct;
  categories: Category[];
  onSaved: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductInput, unknown, z.output<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          ...product,
          description: product.description || "",
          price: Number(product.price),
          optionGroups: product.optionGroups.map((g) => ({
            ...g,
            options: g.options.map((o) => ({ ...o, price: Number(o.price) })),
          })),
        }
      : {
          name: "",
          description: "",
          price: 0,
          categoryId: categories[0]?.id || null,
          active: true,
          featured: false,
          optionGroups: [],
        },
  });
  const [image, setImage] = useState<ImageValue>({
    imageUrl: product?.imageUrl || null,
    imageKey: product?.imageKey || null,
  });
  const [busy, setBusy] = useState(false);
  const [groups, setGroups] = useState<Group[]>(
    product?.optionGroups.map((g) => ({
      ...g,
      options: g.options.map((o) => ({ ...o, price: Number(o.price) })),
    })) || [],
  );
  function change(next: Group[]) {
    setGroups(next);
    setValue("optionGroups", next);
  }
  return (
    <form
      className="stack"
      onSubmit={handleSubmit(async (values) => {
        try {
          await api("/api/catalog", {
            method: "POST",
            body: JSON.stringify({ ...values, ...image }),
          });
          toast.success("Produto salvo.");
          onSaved();
        } catch (e) {
          toast.error((e as Error).message);
        }
      })}
    >
      <ImageUpload
        value={image}
        onChange={setImage}
        folder="products"
        onBusyChange={setBusy}
      />
      <div className="form-grid">
        <label>
          Nome
          <input {...register("name")} required />
        </label>
        <label>
          Preço (R$)
          <input
            type="number"
            min=".01"
            step=".01"
            {...register("price", { valueAsNumber: true })}
          />
        </label>
        <label>
          Categoria
          <select {...register("categoryId")}>
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="span-2">
          Descrição
          <textarea {...register("description")} />
        </label>
      </div>
      <div className="inline-actions">
        <label>
          <input type="checkbox" {...register("active")} /> Disponível
        </label>
        <label>
          <input type="checkbox" {...register("featured")} /> Destaque
        </label>
      </div>
      <h3>Variações e adicionais</h3>
      {groups.map((group, index) => (
        <fieldset key={index} className="option-editor">
          <legend>Grupo {index + 1}</legend>
          <div className="form-grid">
            <label>
              Nome
              <input
                value={group.name}
                onChange={(e) =>
                  change(
                    groups.map((g, i) =>
                      i === index ? { ...g, name: e.target.value } : g,
                    ),
                  )
                }
              />
            </label>
            <label>
              Mínimo
              <input
                type="number"
                min="0"
                value={group.min}
                onChange={(e) =>
                  change(
                    groups.map((g, i) =>
                      i === index ? { ...g, min: Number(e.target.value) } : g,
                    ),
                  )
                }
              />
            </label>
            <label>
              Máximo
              <input
                type="number"
                min="1"
                value={group.max}
                onChange={(e) =>
                  change(
                    groups.map((g, i) =>
                      i === index ? { ...g, max: Number(e.target.value) } : g,
                    ),
                  )
                }
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={group.required}
                onChange={(e) =>
                  change(
                    groups.map((g, i) =>
                      i === index ? { ...g, required: e.target.checked } : g,
                    ),
                  )
                }
              />{" "}
              Obrigatório
            </label>
          </div>
          {group.options.map((option, oi) => (
            <div className="inline-actions" key={oi}>
              <input
                aria-label="Nome da opção"
                placeholder="Bacon, tamanho grande…"
                value={option.name}
                onChange={(e) =>
                  change(
                    groups.map((g, i) =>
                      i === index
                        ? {
                            ...g,
                            options: g.options.map((o, j) =>
                              j === oi ? { ...o, name: e.target.value } : o,
                            ),
                          }
                        : g,
                    ),
                  )
                }
              />
              <input
                aria-label="Preço adicional"
                type="number"
                step=".01"
                min="0"
                value={option.price}
                onChange={(e) =>
                  change(
                    groups.map((g, i) =>
                      i === index
                        ? {
                            ...g,
                            options: g.options.map((o, j) =>
                              j === oi
                                ? { ...o, price: Number(e.target.value) }
                                : o,
                            ),
                          }
                        : g,
                    ),
                  )
                }
              />
              <button
                type="button"
                className="outline-btn"
                onClick={() =>
                  change(
                    groups.map((g, i) =>
                      i === index
                        ? {
                            ...g,
                            options: g.options.filter((_, j) => j !== oi),
                          }
                        : g,
                    ),
                  )
                }
              >
                Remover
              </button>
            </div>
          ))}
          <div className="inline-actions">
            <button
              type="button"
              className="outline-btn"
              onClick={() =>
                change(
                  groups.map((g, i) =>
                    i === index
                      ? {
                          ...g,
                          options: [
                            ...g.options,
                            { name: "", price: 0, active: true },
                          ],
                        }
                      : g,
                  ),
                )
              }
            >
              Adicionar opção
            </button>
            <button
              type="button"
              className="danger-btn"
              onClick={() => {
                if (confirm("Remover este grupo?"))
                  change(groups.filter((_, i) => i !== index));
              }}
            >
              Remover grupo
            </button>
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        className="outline-btn"
        onClick={() =>
          change([
            ...groups,
            {
              name: "",
              min: 0,
              max: 1,
              required: false,
              options: [{ name: "", price: 0, active: true }],
            },
          ])
        }
      >
        Adicionar grupo
      </button>
      {Object.keys(errors).length > 0 && (
        <p className="field-error" role="alert">
          Confira nome, preço e regras dos grupos. O mínimo não pode superar o
          máximo ou as opções disponíveis.
        </p>
      )}
      <button className="primary-btn" disabled={busy || isSubmitting}>
        {isSubmitting ? "Salvando…" : "Salvar produto"}
      </button>
    </form>
  );
}
function CategoryForm({
  category,
  onSaved,
}: {
  category?: Category;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name || "");
  const [active, setActive] = useState(category?.active ?? true);
  const [image, setImage] = useState<ImageValue>({
    imageUrl: category?.imageUrl || null,
    imageKey: category?.imageKey || null,
  });
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api("/api/catalog", {
            method: "POST",
            body: JSON.stringify({
              kind: "category",
              id: category?.id,
              name,
              active,
              ...image,
            }),
          });
          toast.success("Categoria salva.");
          onSaved();
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Nome
        <input
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />{" "}
        Disponível
      </label>
      <ImageUpload
        value={image}
        onChange={setImage}
        folder="categories"
        onBusyChange={setBusy}
      />
      <button className="primary-btn" disabled={busy}>
        Salvar categoria
      </button>
    </form>
  );
}
export default function CatalogEditor() {
  const resource = useResource<Catalog>("/api/catalog");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CatalogProduct | "new" | null>(null);
  const [category, setCategory] = useState<Category | "new" | null>(null);
  if (resource.loading || resource.error)
    return <ResourceState {...resource} retry={resource.refresh} />;
  const data = resource.data!;
  const list = data.products.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="catalog-guidance">
        <b>Seu cardápio começa com um produto.</b> Coloque o nome, o preço e uma
        foto. As categorias ajudam a organizar: lanches, bebidas, sobremesas…
        Toque em um produto para ajustar quando quiser.
      </div>
      <div className="inline-actions">
        <input
          aria-label="Buscar produtos"
          placeholder="Buscar produtos"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="primary-btn" onClick={() => setEditing("new")}>
          Novo produto
        </button>
        <Link className="outline-btn" href="/configuracoes?section=aparencia">
          <Palette size={16} /> Personalizar cardápio
        </Link>
        <button className="outline-btn" onClick={() => setCategory("new")}>
          Nova categoria
        </button>
      </div>
      <div className="category-manager">
        {data.categories.map((c) => (
          <button
            className="outline-btn"
            key={c.id}
            onClick={() => setCategory(c)}
          >
            {c.imageUrl && (
              <img src={c.imageUrl} alt="" width={24} height={24} />
            )}{" "}
            {c.name} · {c.active ? "ativa" : "pausada"}
          </button>
        ))}
      </div>
      <div className="catalog-grid">
        {list.map((p) => (
          <article className="catalog-card" key={p.id}>
            {p.imageUrl ? (
              <img src={p.imageUrl} alt={p.name} />
            ) : (
              <div className="image-placeholder">PEDE360</div>
            )}
            <div>
              <small>
                {data.categories.find((c) => c.id === p.categoryId)?.name ||
                  "Sem categoria"}
              </small>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <strong>{money(p.price)}</strong>
              <span className="badge badge-gray">
                {p.active ? "Disponível" : "Pausado"}
                {p.featured ? " · Destaque" : ""}
              </span>
              <button
                className="outline-btn full"
                onClick={() => setEditing(p)}
              >
                Editar produto
              </button>
            </div>
          </article>
        ))}
      </div>
      {!list.length && (
        <p className="empty-state">
          Nenhum produto encontrado. Cadastre seu primeiro produto.
        </p>
      )}
      {editing && (
        <Modal
          title={editing === "new" ? "Novo produto" : "Editar produto"}
          onClose={() => setEditing(null)}
        >
          <ProductForm
            product={editing === "new" ? undefined : editing}
            categories={data.categories}
            onSaved={() => {
              setEditing(null);
              void resource.refresh();
            }}
          />
        </Modal>
      )}
      {category && (
        <Modal title="Categoria" onClose={() => setCategory(null)}>
          <CategoryForm
            category={category === "new" ? undefined : category}
            onSaved={() => {
              setCategory(null);
              void resource.refresh();
            }}
          />
        </Modal>
      )}
    </>
  );
}
