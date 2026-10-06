"use client";
import { useState } from "react";
import { useResource, ResourceState } from "./shared/resource";
import { api } from "@/lib/client";
import { can } from "@/lib/security/permissions";
import type { SessionView } from "@/lib/view-types";
import { toast } from "sonner";
export default function CourierPicker({
  orderId,
  current,
  onSaved,
}: {
  orderId: string;
  current?: string;
  onSaved: () => void;
}) {
  const user = useResource<SessionView>("/api/auth/me");
  const couriers = useResource<{ id: string; name: string; active: boolean }[]>(
    "/api/operations?kind=couriers",
  );
  const [busy, setBusy] = useState(false);
  if (!user.data || !can(user.data.role, "dispatch")) return null;
  if (!couriers.data)
    return <ResourceState {...couriers} retry={couriers.refresh} />;
  return (
    <label>
      Entregador
      <select
        value={current || ""}
        disabled={busy}
        onChange={async (e) => {
          setBusy(true);
          try {
            await api("/api/orders/assignment", {
              method: "PUT",
              body: JSON.stringify({
                orderId,
                courierId: e.target.value || null,
              }),
            });
            onSaved();
            toast.success("Entregador atualizado.");
          } catch (error) {
            toast.error((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <option value="">Sem entregador</option>
        {couriers.data
          .filter((c) => c.active || c.id === current)
          .map((c) => (
            <option value={c.id} key={c.id}>
              {c.name}
              {c.active ? "" : " · indisponível"}
            </option>
          ))}
      </select>
    </label>
  );
}
