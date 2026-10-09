import { Unzip, UnzipInflate } from "fflate";
import { parse } from "csv-parse";
import { normalizePlace } from "./catalog";

export type AddressDirectory = {
  neighborhoods: string[];
  streets: { name: string; neighborhood: string }[];
};

export async function parseCnefe(
  chunks: AsyncIterable<Uint8Array>,
  cityId: string,
): Promise<AddressDirectory> {
  const neighborhoods = new Map<string, string>(),
    streets = new Map<string, { name: string; neighborhood: string }>();
  let failure: Error | undefined,
    found = false,
    uncompressed = 0;
  const parser = parse({
    delimiter: ";",
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
    max_record_size: 128_000,
  });
  parser.on("error", (error) => {
    failure = error;
  });
  parser.on("data", (row: Record<string, string>) => {
    if (row.COD_MUNICIPIO !== cityId) return;
    const neighborhood = (row.DSC_LOCALIDADE || "").trim().replace(/\s+/g, " ");
    const name = [row.NOM_TIPO_SEGLOGR, row.NOM_TITULO_SEGLOGR, row.NOM_SEGLOGR]
      .filter(Boolean)
      .join(" ")
      .trim()
      .replace(/\s+/g, " ");
    if (neighborhood && neighborhood.length <= 100)
      neighborhoods.set(normalizePlace(neighborhood), neighborhood);
    if (
      row.NOM_SEGLOGR?.trim() &&
      name &&
      name.length <= 180 &&
      neighborhood.length <= 100
    )
      streets.set(normalizePlace(neighborhood) + ":" + normalizePlace(name), {
        name,
        neighborhood,
      });
  });
  const finished = new Promise<void>((resolve, reject) => {
    parser.on("end", resolve);
    parser.on("error", reject);
  });
  // Handle rejection immediately while the ZIP stream is still downloading.
  void finished.catch(() => {});
  const decoder = new TextDecoder("utf-8");
  const unzip = new Unzip((file) => {
    if (!file.name.toLowerCase().endsWith(".csv") || found) return;
    found = true;
    file.ondata = (error, data, final) => {
      if (error) {
        failure = error;
        parser.destroy(error);
        return;
      }
      uncompressed += data.length;
      if (uncompressed > 3_000_000_000) {
        failure = new Error("Arquivo de endereços excede o limite.");
        parser.destroy(failure);
        return;
      }
      parser.write(decoder.decode(data, { stream: !final }));
      if (final) parser.end();
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  try {
    let compressed = 0;
    for await (const chunk of chunks) {
      compressed += chunk.length;
      if (compressed > 200_000_000)
        throw new Error("Arquivo de endereços excede o limite.");
      unzip.push(chunk);
      if (failure) throw failure;
    }
    unzip.push(new Uint8Array(), true);
    if (!found) throw new Error("Arquivo CSV não encontrado.");
    await finished;
    if (failure) throw failure;
  } catch (error) {
    parser.destroy();
    throw error;
  }
  return {
    neighborhoods: [...neighborhoods.values()].sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    ),
    streets: [...streets.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    ),
  };
}
