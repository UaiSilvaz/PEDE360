"use client";
import { useEffect, useState } from "react";
import { useResource } from "./shared/resource";
import type { Store } from "@/lib/view-types";

type Address = {
  cityId: string;
  city: string;
  state: string;
  neighborhood: string;
  street: string;
};
type Options = { options: string[]; total: number; status: string };
const other = "__other__";

function AddressChoice({
  label,
  manualLabel,
  cityId,
  neighborhood,
  kind,
  value,
  onChange,
}: {
  label: string;
  manualLabel: string;
  cityId: string;
  neighborhood?: string;
  kind: "neighborhoods" | "streets";
  value: string;
  onChange: (value: string) => void;
}) {
  const [selected, setSelected] = useState(other),
    [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const params = new URLSearchParams({
    cityId,
    kind,
    q: search,
    neighborhood: neighborhood || "",
  });
  const resource = useResource<Options>(
    cityId ? "/api/geography/addresses?" + params : null,
  );
  const status = resource.data?.status;
  const refresh = resource.refresh;
  useEffect(() => {
    if (!["PENDING", "PROCESSING"].includes(status || "")) return;
    const timer = setInterval(() => void refresh(), 5000);
    return () => clearInterval(timer);
  }, [status, refresh]);
  const options = [
    ...new Set([
      ...(selected !== other && value ? [value] : []),
      ...(resource.data?.options || []),
    ]),
  ];
  return (
    <div className="stack delivery-address-choice">
      {cityId && (
        <label>
          Buscar {label.toLowerCase()}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              kind === "streets" ? "Ex.: Castro Alves" : "Ex.: Centro"
            }
          />
        </label>
      )}
      <label>
        {label}
        <select
          aria-label={label}
          value={selected === other ? other : value}
          onChange={(event) => {
            const choice = event.target.value;
            setSelected(choice);
            onChange(choice === other ? "" : choice);
          }}
        >
          <option value={other}>Outro</option>
          {options.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      {selected === other && (
        <label>
          {manualLabel}
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            maxLength={kind === "streets" ? 180 : 100}
            autoComplete={
              kind === "streets" ? "address-line1" : "address-level3"
            }
          />
        </label>
      )}
      {cityId &&
        (resource.loading ||
          ["PENDING", "PROCESSING"].includes(resource.data?.status || "")) && (
          <small className="muted">
            Carregando a lista. Você pode usar Outro e preencher agora.
          </small>
        )}
      {resource.data && resource.data.total > 100 && (
        <small className="muted">
          Digite parte do nome para refinar as {resource.data.total} opções.
        </small>
      )}
      {cityId &&
        (resource.error ||
          ["FAILED", "UNAVAILABLE"].includes(resource.data?.status || "")) && (
          <small className="muted">
            Lista indisponível. Use Outro para informar o endereço.
          </small>
        )}
    </div>
  );
}

export default function DeliveryAddressFields({
  store,
  value,
  onChange,
}: {
  store: Store;
  value: Address;
  onChange: (value: Partial<Address>) => void;
}) {
  const [cityChoice, setCityChoice] = useState(value.cityId || other);
  return (
    <>
      <label>
        Estado
        <input
          value={value.state || store.deliveryState || ""}
          readOnly
          placeholder="Informe o estado junto à cidade, se necessário"
        />
      </label>
      <label>
        Cidade
        <select
          aria-label="Cidade"
          value={cityChoice}
          onChange={(event) => {
            const cityId = event.target.value;
            setCityChoice(cityId);
            onChange({
              cityId: cityId === other ? "" : cityId,
              city: cityId === other ? "" : store.deliveryCity || "",
              state: store.deliveryState || "",
              neighborhood: "",
              street: "",
            });
          }}
        >
          <option value={other}>Outro</option>
          {store.deliveryCityId && (
            <option value={store.deliveryCityId}>{store.deliveryCity}</option>
          )}
        </select>
      </label>
      {cityChoice === other && (
        <label className="span-2">
          Nome da cidade
          <input
            value={value.city}
            onChange={(event) => onChange({ city: event.target.value })}
            maxLength={120}
            autoComplete="address-level2"
          />
        </label>
      )}
      {store.deliveryCity && (
        <p className="muted span-2">
          Esta loja atende {store.deliveryCity} — {store.deliveryState}. Para um
          endereço que não está listado, escolha Outro.
        </p>
      )}
      <AddressChoice
        key={value.cityId + ":neighborhoods"}
        label="Bairro"
        manualLabel="Nome do bairro"
        cityId={value.cityId}
        kind="neighborhoods"
        value={value.neighborhood}
        onChange={(neighborhood) => onChange({ neighborhood, street: "" })}
      />
      <AddressChoice
        key={value.cityId + ":" + value.neighborhood}
        label="Rua"
        manualLabel="Nome da rua"
        cityId={value.cityId}
        neighborhood={value.neighborhood}
        kind="streets"
        value={value.street}
        onChange={(street) => onChange({ street })}
      />
    </>
  );
}
