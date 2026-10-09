import test from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import {
  municipalities,
  states,
  municipality,
  deliveryRegion,
} from "../lib/geography/catalog";
import { parseCnefe } from "../lib/geography/cnefe";

test("official municipality catalog covers every UF and rejects mismatched regions", () => {
  assert.equal(states.length, 27);
  assert.equal(municipalities.length, 5571);
  assert.equal(
    new Set(municipalities.map((city) => city.id)).size,
    municipalities.length,
  );
  for (const state of states)
    assert(municipalities.some((city) => city.state === state.uf));
  assert.equal(municipality("3500204")?.name, "Adolfo");
  assert.equal(municipality("3550308")?.name, "São Paulo");
  assert.equal(states.find(state => state.uf === "AP")?.name, "Amapá");
  assert.deepEqual(deliveryRegion("SP", "3500204"), {
    deliveryState: "SP",
    deliveryCityId: "3500204",
    deliveryCity: "Adolfo",
  });
  assert.throws(() => deliveryRegion("MG", "3500204"));
  assert.throws(() => deliveryRegion("SP", "0000000"));
});

test("streamed CNEFE import handles ZIP/UTF-8/quoted fields, deduplicates and isolates the city", async () => {
  const csv =
    '\uFEFFCOD_MUNICIPIO;DSC_LOCALIDADE;NOM_TIPO_SEGLOGR;NOM_TITULO_SEGLOGR;NOM_SEGLOGR\n3500204;CENTRO;RUA;;JOSÉ\n3500204;CENTRO;RUA;;JOSÉ\n3500204;"JARDIM; NOVO";AVENIDA;DOUTOR;JOÃO\n3550308;OUTRA CIDADE;RUA;;NÃO INCLUIR\n';
  const zip = zipSync({ "city.csv": strToU8(csv) });
  async function* chunks() {
    for (let i = 0; i < zip.length; i += 7) yield zip.slice(i, i + 7);
  }
  const data = await parseCnefe(chunks(), "3500204");
  assert.equal(data.streets.length, 2);
  assert(
    data.streets.some(
      (street) =>
        street.name === "RUA JOSÉ" && street.neighborhood === "CENTRO",
    ),
  );
  assert(
    data.streets.some(
      (street) =>
        street.name === "AVENIDA DOUTOR JOÃO" &&
        street.neighborhood === "JARDIM; NOVO",
    ),
  );
  assert.deepEqual(data.neighborhoods, ["CENTRO", "JARDIM; NOVO"]);
});
