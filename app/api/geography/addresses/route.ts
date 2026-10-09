import { db } from "@/lib/db";
import { endpoint, ok, ApiError } from "@/lib/api";
import { municipality, normalizePlace } from "@/lib/geography/catalog";
import { directoryData } from "@/lib/geography/directory";
export const GET = endpoint(async (request) => {
  const params = new URL(request.url).searchParams;
  const cityId = params.get("cityId") || "",
    kind = params.get("kind") || "neighborhoods";
  if (!municipality(cityId) || !["neighborhoods", "streets"].includes(kind))
    throw new ApiError(400, "CITY", "Cidade ou consulta inválida.");
  const record = await db.cityAddressDirectory.findUnique({
    where: { cityId },
  });
  const data = directoryData(record?.data);
  const query = normalizePlace((params.get("q") || "").slice(0, 100));
  const neighborhood = normalizePlace(
    (params.get("neighborhood") || "").slice(0, 100),
  );
  const candidates =
    kind === "neighborhoods"
      ? data.neighborhoods
      : [
          ...new Set(
            data.streets
              .filter(
                (street) =>
                  !neighborhood ||
                  normalizePlace(street.neighborhood) === neighborhood,
              )
              .map((street) => street.name),
          ),
        ];
  const matches = candidates.filter(
    (name) => !query || normalizePlace(name).includes(query),
  );
  const response = ok({
    status: record?.status || "PENDING",
    options: matches.slice(0, 100),
    total: matches.length,
    source: "IBGE — CNEFE 2022",
  });
  response.headers.set(
    "Cache-Control",
    record?.status === "READY"
      ? "public, max-age=300, s-maxage=3600"
      : "no-store",
  );
  return response;
});
