import "server-only";
import manifest from "./cnefe-manifest.json";
import { db } from "@/lib/db";
import { municipality } from "./catalog";
import { parseCnefe, type AddressDirectory } from "./cnefe";

const archiveBase =
  "https://ftp.ibge.gov.br/Cadastro_Nacional_de_Enderecos_para_Fins_Estatisticos/Censo_Demografico_2022/Arquivos_CNEFE/CSV/Municipio/";
export async function prepareDirectory(cityId: string) {
  if (!municipality(cityId)) return;
  const path = (manifest as Record<string, string>)[cityId];
  await db.cityAddressDirectory.upsert({
    where: { cityId },
    create: { cityId },
    update: {},
  });
  await db.cityAddressDirectory.updateMany({
    where: {
      cityId,
      status: "PROCESSING",
      updatedAt: { lt: new Date(Date.now() - 10 * 60_000) },
    },
    data: { status: "PENDING" },
  });
  const claimed = await db.cityAddressDirectory.updateMany({
    where: { cityId, status: { in: ["PENDING", "FAILED"] } },
    data: { status: "PROCESSING", error: null },
  });
  if (!claimed.count) return;
  if (!path) {
    await db.cityAddressDirectory.update({
      where: { cityId },
      data: {
        status: "UNAVAILABLE",
        error: "A cidade ainda não consta na base de endereços do Censo 2022.",
      },
    });
    return;
  }
  const sourceUrl = new URL(path, archiveBase).href;
  try {
    const response = await fetch(sourceUrl, {
      signal: AbortSignal.timeout(270_000),
      cache: "no-store",
    });
    if (!response.ok || !response.body)
      throw new Error(
        "IBGE indisponível. Tente carregar os endereços novamente.",
      );
    const reader = response.body.getReader();
    async function* chunks() {
      try {
        for (;;) {
          const chunk = await reader.read();
          if (chunk.done) break;
          yield chunk.value;
        }
      } finally {
        reader.releaseLock();
      }
    }
    const data = await parseCnefe(chunks(), cityId);
    await db.cityAddressDirectory.update({
      where: { cityId },
      data: { data, status: "READY", sourceUrl, error: null },
    });
  } catch {
    await db.cityAddressDirectory.update({
      where: { cityId },
      data: {
        status: "FAILED",
        sourceUrl,
        error:
          "Não foi possível carregar os endereços do IBGE. Use Outro ou tente novamente.",
      },
    });
  }
}
export function directoryData(data: unknown): AddressDirectory {
  const value = data as Partial<AddressDirectory> | null;
  return {
    neighborhoods: Array.isArray(value?.neighborhoods)
      ? value.neighborhoods
      : [],
    streets: Array.isArray(value?.streets) ? value.streets : [],
  };
}
