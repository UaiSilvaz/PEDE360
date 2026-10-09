"use client";
import states from "@/lib/geography/states.json";
import { useResource } from "./shared/resource";
type City = { id: string; name: string; state: string };
export default function DeliveryRegionFields({
  state,
  cityId,
  onChange,
  required = true,
}: {
  state: string;
  cityId: string;
  required?: boolean;
  onChange: (state: string, cityId: string) => void;
}) {
  const cities = useResource<City[]>(
    state ? "/api/geography?state=" + state : null,
  );
  return (
    <>
      <label>
        Estado atendido
        <select
          aria-label="Estado atendido"
          required={required}
          value={state}
          onChange={(event) => onChange(event.target.value, "")}
        >
          <option value="">Selecione o estado</option>
          {states.map((item) => (
            <option key={item.uf} value={item.uf}>
              {item.name} ({item.uf})
            </option>
          ))}
        </select>
      </label>
      <label>
        Cidade atendida
        <select
          aria-label="Cidade atendida"
          required={required}
          disabled={!state || cities.loading}
          value={cityId}
          onChange={(event) => onChange(state, event.target.value)}
        >
          <option value="">
            {state && cities.loading
              ? "Carregando cidades…"
              : "Selecione a cidade"}
          </option>
          {(cities.data || [])
            .filter((city) => city.state === state)
            .map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
        </select>
        {cities.error && (
          <small role="alert">
            Não foi possível carregar as cidades.{" "}
            <button type="button" onClick={() => void cities.refresh()}>
              Tentar novamente
            </button>
          </small>
        )}
      </label>
    </>
  );
}
