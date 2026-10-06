"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "@/lib/client";
import { toast } from "sonner";
import Link from "next/link";
import BrandIcon from "./brand-icon";
type Fields = {
  name: string;
  store: string;
  slug: string;
  email: string;
  password: string;
};
export default function AuthForm({
  register: signup = false,
}: {
  register?: boolean;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    getFieldState,
    formState: { isSubmitting },
  } = useForm<Fields>();
  const [error, setError] = useState("");
  const [stores, setStores] = useState<{ name: string; slug: string }[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  return (
    <main className="auth-page">
      <form
        className="panel auth-card"
        onSubmit={handleSubmit(async (values) => {
          setError("");
          try {
            const result = await api<{
              stores?: { name: string; slug: string }[];
            }>("/api/auth/" + (signup ? "register" : "login"), {
              method: "POST",
              body: JSON.stringify(
                signup
                  ? values
                  : {
                      email: values.email,
                      password: values.password,
                      ...(selectedStore ? { slug: selectedStore } : {}),
                    },
              ),
            });
            if (result.stores) {
              setStores(result.stores);
              setSelectedStore("");
              return;
            }
            toast.success(signup ? "Estabelecimento criado." : "Bem-vindo.");
            router.push("/painel");
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          }
        })}
      >
        <div className="auth-brand">
          <BrandIcon size={72} light />
          <b>
            PEDE<span>360</span>
          </b>
        </div>
        <span className="eyebrow">PEDE360 · GESTÃO & DELIVERY</span>
        <h1>{signup ? "Sua loja começa aqui" : "Que bom ter você de volta"}</h1>
        <p>
          {signup
            ? "Crie o cardápio, configure a loja e comece a receber pedidos."
            : "Entre para cuidar da sua loja, dos pedidos e dos clientes."}
        </p>
        <div className="form-grid">
          {signup && (
            <>
              <label>
                Seu nome
                <input required {...register("name")} />
              </label>
              <label>
                Nome do estabelecimento
                <input
                  required
                  {...register("store", {
                    onChange: (e) => {
                      if (!getFieldState("slug").isDirty)
                        setValue(
                          "slug",
                          String(e.target.value)
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "")
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-|-$/g, "")
                            .slice(0, 60),
                        );
                    },
                  })}
                />
              </label>
            </>
          )}
          {signup && (
            <label className="span-2">
              Endereço do cardápio
              <input
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                aria-label="Endereço do cardápio"
                placeholder="minha-loja"
                {...register("slug")}
              />
              <small className="field-hint">
                Este nome forma o link do seu cardápio. Você pode ajustá-lo.
              </small>
            </label>
          )}
          <label className="span-2">
            E-mail
            <input
              type="email"
              autoComplete="email"
              required
              {...register("email", {
                onChange: () => {
                  setStores([]);
                  setSelectedStore("");
                },
              })}
            />
          </label>
          <label className="span-2">
            Senha
            <input
              type="password"
              minLength={signup ? 12 : 1}
              maxLength={128}
              autoComplete={signup ? "new-password" : "current-password"}
              required
              {...register("password", {
                onChange: () => {
                  setStores([]);
                  setSelectedStore("");
                },
              })}
            />
          </label>
        </div>
        {!signup && stores.length > 0 && (
          <label className="login-store-choice">
            Escolha a loja
            <select
              required
              value={selectedStore}
              onChange={(event) => setSelectedStore(event.target.value)}
            >
              <option value="">Selecione sua loja</option>
              {stores.map((store) => (
                <option key={store.slug} value={store.slug}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-btn full" disabled={isSubmitting}>
          {isSubmitting
            ? "Aguarde…"
            : signup
              ? "Criar estabelecimento"
              : "Entrar"}
        </button>
        <Link href={signup ? "/entrar" : "/cadastro"}>
          {signup ? "Já tenho uma conta" : "Cadastrar estabelecimento"}
        </Link>
        <Link href="/loja/demo">Explorar o cardápio de exemplo</Link>
      </form>
    </main>
  );
}
