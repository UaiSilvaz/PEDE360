"use client";
import { useState } from "react";
import { Copy, ExternalLink, Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "./workspace-context";
import Modal from "./shared/modal";
export default function ShareMenu({ compact = false }: { compact?: boolean }) {
  const { user } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  return (
    <>
      <button
        type="button"
        aria-label="Compartilhar cardápio"
        className={compact ? "outline-btn share-top-button" : "primary-btn"}
        onClick={() => {
          setUrl(window.location.origin + "/loja/" + user.merchant.slug);
          setCopied(false);
          setOpen(true);
        }}
      >
        <Share2 size={16} />
        <span>Compartilhar cardápio</span>
      </button>
      {open && (
        <Modal
          title="Seu cardápio, pertinho do cliente"
          onClose={() => setOpen(false)}
        >
          <div className="stack">
            <p>
              Copie o link e envie nas suas conversas, ou coloque na descrição
              do seu perfil.
            </p>
            <label className="share-link-field">
              Link do seu cardápio
              <input readOnly value={url} onFocus={(e) => e.target.select()} />
            </label>
            <div className="inline-actions">
              <button
                className="primary-btn"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url);
                    setCopied(true);
                    toast.success("Link copiado. Agora é só colar e enviar.");
                  } catch {
                    toast.error(
                      "Selecione o link acima e copie pelo seu dispositivo.",
                    );
                  }
                }}
              >
                {copied ? <Check size={17} /> : <Copy size={17} />}{" "}
                {copied ? "Link copiado" : "Copiar link"}
              </button>
              <a
                className="outline-btn"
                href={url}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={16} />
                Ver como cliente
              </a>
            </div>
            <div className="help-callout">
              <Share2 size={20} />
              <p>
                Quem abrir o link pode escolher os produtos e enviar um pedido
                para sua loja.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
