import { states, municipalities } from "@/lib/geography/catalog";
import { endpoint, ok, ApiError } from "@/lib/api";
export const GET = endpoint(async (request) => {
  const state = new URL(request.url).searchParams.get("state");
  if (state && !states.some((value) => value.uf === state))
    throw new ApiError(400, "STATE", "Estado inválido.");
  const response = ok(
    state ? municipalities.filter((city) => city.state === state) : states,
  );
  response.headers.set(
    "Cache-Control",
    "public, max-age=86400, s-maxage=604800",
  );
  return response;
});
