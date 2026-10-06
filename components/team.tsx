"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { useResource, ResourceState } from "./shared/resource";
import { roles } from "@/lib/security/permissions";
import { toast } from "sonner";
type Staff = { id: string; name: string; email: string; role: string };
type Log = {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string | null;
};
export default function Team() {
  const staff = useResource<Staff[]>("/api/operations?kind=staff");
  const audit = useResource<Log[]>("/api/operations?kind=audit");
  const [busy, setBusy] = useState(false);
  return (
    <div className="stack">
      <section className="panel compact">
        <h2>Equipe</h2>
        <ResourceState {...staff} retry={staff.refresh} />
        {staff.data && (
          <>
            <div className="table-card">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Perfil</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.data.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details>
              <summary>Adicionar funcionário</summary>
              <form
                className="stack"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  setBusy(true);
                  try {
                    await api("/api/staff", {
                      method: "POST",
                      body: JSON.stringify(
                        Object.fromEntries(new FormData(form)),
                      ),
                    });
                    form.reset();
                    await staff.refresh();
                    toast.success("Funcionário cadastrado.");
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label>
                  Nome
                  <input name="name" required minLength={2} />
                </label>
                <label>
                  E-mail
                  <input name="email" type="email" required />
                </label>
                <label>
                  Senha inicial
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                  />
                </label>
                <label>
                  Perfil
                  <select name="role" defaultValue="ATTENDANT">
                    {roles.map((role) => (
                      <option key={role}>{role}</option>
                    ))}
                  </select>
                </label>
                <button className="primary-btn" disabled={busy}>
                  Cadastrar funcionário
                </button>
              </form>
            </details>
          </>
        )}
      </section>
      <section className="panel compact">
        <h2>Histórico de atividades</h2>
        <ResourceState {...audit} retry={audit.refresh} />
        {audit.data?.map((log) => (
          <div className="line-item" key={log.id}>
            <span>
              {log.entityType} · {log.action}
              <small className="muted"> · {log.entityId}</small>
            </span>
            <time>{new Date(log.createdAt).toLocaleString("pt-BR")}</time>
          </div>
        ))}
        {audit.data?.length === 0 && <p>Nenhuma atividade registrada.</p>}
      </section>
    </div>
  );
}
