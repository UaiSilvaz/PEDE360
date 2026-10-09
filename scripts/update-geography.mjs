import { writeFile } from "node:fs/promises";

const localities = "https://servicodados.ibge.gov.br/api/v1/localidades/";
const archives =
  "https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/Censo_Demografico_2022/Arquivos_CNEFE/CSV/Municipio/";
async function download(url, json = true) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return json ? response.json() : response.text();
}
const [officialStates, officialCities] = await Promise.all([
  download(localities + "estados?orderBy=nome"),
  download(localities + "municipios?orderBy=nome"),
]);
const states = officialStates.map((state) => ({
  id: String(state.id),
  uf: state.sigla,
  name: state.nome,
}));
const cities = officialCities.map((city) => ({
  id: String(city.id),
  name: city.nome,
  state:
    city.microrregiao?.mesorregiao?.UF?.sigla ||
    city["regiao-imediata"]?.["regiao-intermediaria"]?.UF?.sigla,
}));
if (
  states.length !== 27 ||
  cities.length < 5500 ||
  cities.some((city) => !city.state)
)
  throw new Error("Catálogo oficial incompleto.");
const manifest = {},
  queue = [...states];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let state; (state = queue.shift());) {
      const directory = state.id + "_" + state.uf + "/";
      const html = await download(archives + directory, false);
      for (const match of html.matchAll(/href="(\d{7}_[^"]+\.zip)"/gi))
        manifest[match[1].slice(0, 7)] = directory + match[1];
    }
  }),
);
if (Object.keys(manifest).length < 5500)
  throw new Error("Manifesto CNEFE incompleto.");
for (const [name, data] of [
  ["states", states],
  ["cities", cities],
  ["cnefe-manifest", manifest],
]) {
  await writeFile(
    new URL(`../lib/geography/${name}.json`, import.meta.url),
    JSON.stringify(data, null, 2) + "\n",
  );
}
console.log(
  `${states.length} UFs, ${cities.length} municípios e ${Object.keys(manifest).length} arquivos municipais CNEFE.`,
);
