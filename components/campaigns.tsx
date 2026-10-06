"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { useResource, ResourceState } from "./shared/resource";
import ImageUpload from "./shared/image-upload";
import Modal from "./shared/modal";
import type { ImageValue } from "@/lib/view-types";
import { toast } from "sonner";
type Campaign = ImageValue & { id: string; name: string; text: string };
function Form({
  campaign,
  onSaved,
}: {
  campaign?: Campaign;
  onSaved: () => void;
}) {
  const [image, setImage] = useState<ImageValue>({
    imageUrl: campaign?.imageUrl || null,
    imageKey: campaign?.imageKey || null,
  });
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const fields = Object.fromEntries(new FormData(e.currentTarget));
        setBusy(true);
        try {
          await api("/api/campaigns", {
            method: "POST",
            body: JSON.stringify({ ...fields, ...image, id: campaign?.id }),
          });
          toast.success("Rascunho salvo.");
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
        <input name="name" required defaultValue={campaign?.name} />
      </label>
      <label>
        Texto
        <textarea name="text" required defaultValue={campaign?.text} />
      </label>
      <ImageUpload
        label="Imagem da campanha"
        folder="campaigns"
        value={image}
        onChange={setImage}
        onBusyChange={setBusy}
      />
      <button className="primary-btn" disabled={busy}>
        Salvar rascunho
      </button>
    </form>
  );
}
export default function Campaigns() {
  const r = useResource<Campaign[]>("/api/campaigns");
  const [edit, setEdit] = useState<Campaign | "new" | null>(null);
  return (
    <section className="panel compact">
      <h2>Campanhas</h2>
      <p>
        Organize texto e imagem de suas campanhas. O disparo em massa depende de
        configuração e não está habilitado.
      </p>
      <button className="outline-btn" onClick={() => setEdit("new")}>
        Criar rascunho
      </button>
      <ResourceState {...r} retry={r.refresh} />
      <div className="record-grid">
        {r.data?.map((c) => (
          <article key={c.id}>
            {c.imageUrl && <img src={c.imageUrl} alt={c.name} width={140} />}
            <h3>{c.name}</h3>
            <p>{c.text}</p>
            <button className="outline-btn" onClick={() => setEdit(c)}>
              Editar rascunho
            </button>
          </article>
        ))}
      </div>
      {r.data?.length === 0 && <p>Nenhum rascunho criado.</p>}
      {edit && (
        <Modal title="Rascunho da campanha" onClose={() => setEdit(null)}>
          <Form
            campaign={edit === "new" ? undefined : edit}
            onSaved={() => {
              setEdit(null);
              void r.refresh();
            }}
          />
        </Modal>
      )}
    </section>
  );
}
