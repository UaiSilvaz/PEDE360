"use client";
import {
  Bold,
  Italic,
  RotateCcw,
  Palette,
  Type,
  MousePointer2,
} from "lucide-react";
import {
  defaultAppearance,
  contrastRatio,
  menuStyle,
  type MenuAppearance,
} from "@/lib/menu-appearance";
const presets = [
  {
    name: "PEDE360",
    colors: {
      backgroundColor: "#f5f9f6",
      surfaceColor: "#ffffff",
      textColor: "#192e20",
      buttonColor: "#078832",
      buttonTextColor: "#ffffff",
      coverColor: "#18d058",
    },
  },
  {
    name: "Brasa",
    colors: {
      backgroundColor: "#fff7ef",
      surfaceColor: "#ffffff",
      textColor: "#402619",
      buttonColor: "#b94216",
      buttonTextColor: "#ffffff",
      coverColor: "#d76532",
    },
  },
  {
    name: "Noturno",
    colors: {
      backgroundColor: "#121c18",
      surfaceColor: "#1d3026",
      textColor: "#eef8f1",
      buttonColor: "#4ee584",
      buttonTextColor: "#102d1b",
      coverColor: "#215936",
    },
  },
  {
    name: "Açaí",
    colors: {
      backgroundColor: "#f8f3fc",
      surfaceColor: "#ffffff",
      textColor: "#352047",
      buttonColor: "#7832a0",
      buttonTextColor: "#ffffff",
      coverColor: "#a65bc4",
    },
  },
];
const colors: [
  keyof Pick<
    MenuAppearance,
    | "backgroundColor"
    | "surfaceColor"
    | "textColor"
    | "buttonColor"
    | "buttonTextColor"
    | "coverColor"
  >,
  string,
][] = [
  ["backgroundColor", "Cor do fundo"],
  ["surfaceColor", "Cor dos cartões"],
  ["textColor", "Cor do texto"],
  ["buttonColor", "Cor dos botões"],
  ["buttonTextColor", "Texto dos botões"],
  ["coverColor", "Cor da capa"],
];
export default function MenuAppearanceEditor({
  value,
  onChange,
  name,
  description,
  logoUrl,
  coverUrl,
}: {
  value: MenuAppearance;
  onChange: (value: MenuAppearance) => void;
  name: string;
  description?: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
}) {
  function field<K extends keyof MenuAppearance>(
    key: K,
    next: MenuAppearance[K],
  ) {
    onChange({ ...value, [key]: next });
  }
  const textContrast = contrastRatio(value.textColor, value.surfaceColor);
  const buttonContrast = contrastRatio(
    value.buttonStyle === "outline" ? value.buttonColor : value.buttonTextColor,
    value.buttonStyle === "outline" ? value.surfaceColor : value.buttonColor,
  );
  return (
    <section className="menu-appearance-editor">
      <div className="appearance-heading">
        <div>
          <h3>Personalizar meu cardápio</h3>
          <p>Ajuste as cores e o estilo. Veja o resultado antes de salvar.</p>
        </div>
        <button
          type="button"
          className="outline-btn"
          onClick={() => onChange({ ...defaultAppearance })}
        >
          <RotateCcw size={15} /> Restaurar padrão
        </button>
      </div>
      <div className="appearance-layout">
        <div className="appearance-controls">
          <fieldset>
            <legend>
              <Palette size={18} /> Cores da sua marca
            </legend>
            <span className="appearance-hint">
              Comece com uma combinação ou escolha cada cor.
            </span>
            <div className="appearance-presets">
              {presets.map((preset) => (
                <button
                  type="button"
                  key={preset.name}
                  aria-label={`Aplicar tema ${preset.name}`}
                  onClick={() => onChange({ ...value, ...preset.colors })}
                >
                  <span className="preset-swatches" aria-hidden="true">
                    {[
                      preset.colors.coverColor,
                      preset.colors.buttonColor,
                      preset.colors.backgroundColor,
                    ].map((color, index) => (
                      <i key={index} style={{ backgroundColor: color }} />
                    ))}
                  </span>
                  {preset.name}
                </button>
              ))}
            </div>
            <div className="appearance-color-grid">
              {colors.map(([key, label]) => (
                <label key={key}>
                  <span>{label}</span>
                  <span className="color-picker-field">
                    <input
                      type="color"
                      aria-label={label}
                      value={value[key]}
                      onChange={(event) => field(key, event.target.value)}
                    />
                    <code>{value[key].toUpperCase()}</code>
                  </span>
                </label>
              ))}
            </div>
            {(textContrast < 4.5 || buttonContrast < 4.5) && (
              <p className="appearance-contrast" role="status">
                Para facilitar a leitura, use um texto mais claro ou escuro em
                relação ao fundo
                {buttonContrast < 4.5 ? " dos botões" : " dos cartões"}.
              </p>
            )}
          </fieldset>
          <fieldset>
            <legend>
              <Type size={18} /> Textos e fontes
            </legend>
            <div className="appearance-form-grid">
              <label>
                Fonte do cardápio
                <select
                  value={value.fontFamily}
                  onChange={(e) =>
                    field(
                      "fontFamily",
                      e.target.value as MenuAppearance["fontFamily"],
                    )
                  }
                >
                  <option value="modern">Moderna</option>
                  <option value="rounded">Arredondada</option>
                  <option value="classic">Clássica</option>
                </select>
              </label>
              <label>
                Tamanho do texto
                <select
                  value={value.fontSize}
                  onChange={(e) => field("fontSize", Number(e.target.value))}
                >
                  {[14, 16, 18, 20].map((size) => (
                    <option key={size} value={size}>
                      {size} px{size === 16 ? " · padrão" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="appearance-toggles">
              {(
                [
                  ["boldTitles", "Títulos em negrito"],
                  ["boldText", "Descrições em negrito"],
                  ["boldButtons", "Botões em negrito"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={value[key]}
                    onChange={(e) => field(key, e.target.checked)}
                  />
                  <Bold size={15} />
                  {label}
                </label>
              ))}
              <label>
                <input
                  type="checkbox"
                  checked={value.italicText}
                  onChange={(e) => field("italicText", e.target.checked)}
                />
                <Italic size={15} />
                Descrições em itálico
              </label>
            </div>
          </fieldset>
          <fieldset>
            <legend>
              <MousePointer2 size={18} /> Botões e cartões
            </legend>
            <div className="appearance-form-grid">
              <label>
                Estilo dos botões
                <select
                  value={value.buttonStyle}
                  onChange={(e) =>
                    field(
                      "buttonStyle",
                      e.target.value as MenuAppearance["buttonStyle"],
                    )
                  }
                >
                  <option value="filled">Preenchidos</option>
                  <option value="outline">Com contorno</option>
                </select>
              </label>
              <label>
                Formato dos botões
                <select
                  value={value.buttonRadius}
                  onChange={(e) =>
                    field("buttonRadius", Number(e.target.value))
                  }
                >
                  <option value={0}>Reto</option>
                  <option value={12}>Suave</option>
                  <option value={30}>Arredondado</option>
                </select>
              </label>
              <label>
                Formato dos cartões
                <select
                  value={value.cardRadius}
                  onChange={(e) => field("cardRadius", Number(e.target.value))}
                >
                  <option value={0}>Reto</option>
                  <option value={12}>Suave</option>
                  <option value={24}>Arredondado</option>
                </select>
              </label>
            </div>
          </fieldset>
        </div>
        <aside className="appearance-preview">
          <div className="appearance-preview-label">
            <span>PRÉVIA AO VIVO</span>
            <small>Suas alterações aparecem aqui.</small>
          </div>
          <div
            className="storefront custom-menu menu-preview"
            style={menuStyle(value)}
            aria-label="Prévia do cardápio"
          >
            <div className="store-cover">
              {coverUrl && <img src={coverUrl} alt="Capa da sua loja" />}
            </div>
            <div className="store-profile">
              <div className="store-logo">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo da sua loja" />
                ) : (
                  <img src="/brand/PEDE360.png" alt="PEDE360" />
                )}
              </div>
              <div>
                <h1>{name || "Sua loja"}</h1>
                <p>{description || "Seu sabor favorito, do seu jeito."}</p>
                <div className="store-meta">
                  <span className="open-pill">Aberto agora</span>
                  <span>30–45 min</span>
                </div>
              </div>
            </div>
            <div className="store-cats">
              <span className="menu-preview-category">Todos</span>
              <span>Lanches</span>
              <span>Bebidas</span>
            </div>
            <main className="store-products">
              <section>
                <h2>Escolhas da casa</h2>
                <div className="store-product-list">
                  <article>
                    <div>
                      <h3>Burger da casa</h3>
                      <p>Hambúrguer artesanal, queijo e molho especial.</p>
                      <strong>R$ 29,90</strong>
                    </div>
                    <div className="product-photo">
                      <img src="/landing/burger.jpg" alt="Exemplo de produto" />
                    </div>
                  </article>
                  <article>
                    <div>
                      <h3>Pizza especial</h3>
                      <p>Massa fina, queijo e manjericão fresco.</p>
                      <strong>R$ 49,90</strong>
                    </div>
                    <div className="product-photo">
                      <img src="/landing/pizza.jpg" alt="Exemplo de pizza" />
                    </div>
                  </article>
                </div>
              </section>
            </main>
            <div className="menu-preview-action">
              <span>Ver pedido</span>
              <strong>R$ 29,90</strong>
            </div>
          </div>
          <small className="appearance-hint">
            Produtos ilustrativos. As fotos e os produtos da sua loja serão
            mantidos.
          </small>
        </aside>
      </div>
    </section>
  );
}
