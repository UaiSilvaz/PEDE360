"use client";
import { useState } from "react";
import { useResource, ResourceState } from "./shared/resource";
import type { SessionView, ImageValue } from "@/lib/view-types";
import ImageUpload from "./shared/image-upload";
import { api } from "@/lib/client";
import { toast } from "sonner";
function Form({ user }: { user: SessionView }) {
  const [name, setName] = useState(user.name);
  const [image, setImage] = useState<ImageValue>({
    imageUrl: user.imageUrl,
    imageKey: user.imageKey,
  });
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="panel compact stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api("/api/profile", {
            method: "PUT",
            body: JSON.stringify({ name, ...image }),
          });
          toast.success("Perfil salvo.");
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
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>
      <ImageUpload
        folder="profile"
        value={image}
        onChange={setImage}
        onBusyChange={setBusy}
      />
      <button className="primary-btn" disabled={busy}>
        Salvar perfil
      </button>
    </form>
  );
}
export default function Profile() {
  const r = useResource<SessionView>("/api/auth/me");
  return r.data ? (
    <Form user={r.data} />
  ) : (
    <ResourceState {...r} retry={r.refresh} />
  );
}
