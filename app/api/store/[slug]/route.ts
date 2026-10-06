import { publicStore } from "@/lib/services/store";
import { ok, fail, ApiError } from "@/lib/api";
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const store = await publicStore((await context.params).slug);
    if (!store) throw new ApiError(404, "NOT_FOUND", "Loja não encontrada.");
    return ok(store);
  } catch (e) {
    return fail(e);
  }
}
