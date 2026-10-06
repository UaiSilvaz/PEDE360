import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export const ok = (data: unknown, status = 200) =>
  Response.json({ success: true, data }, { status });
export function fail(error: unknown) {
  if (error instanceof ApiError)
    return Response.json(
      { success: false, error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  if (error instanceof ZodError)
    return fail(
      new ApiError(
        400,
        "VALIDATION",
        error.issues.map((i) => i.path.join(".") + ": " + i.message).join("; "),
      ),
    );
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
    return fail(new ApiError(409, "CONFLICT", "Este registro já existe."));
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  )
    return fail(new ApiError(404, "NOT_FOUND", "Registro não encontrado."));
  console.error(
    "request_failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return fail(
    new ApiError(
      503,
      "UNAVAILABLE",
      "Serviço indisponível. Verifique a configuração e tente novamente.",
    ),
  );
}
export function endpoint(fn: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      return await fn(request);
    } catch (error) {
      return fail(error);
    }
  };
}
export async function readBody(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new ApiError(413, "TOO_LARGE", "Conteúdo muito grande.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
export async function json(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(415, "CONTENT_TYPE", "Envie JSON.");
  const body = (await readBody(request, 128_000)).toString("utf8");
  try {
    return JSON.parse(body);
  } catch {
    throw new ApiError(400, "INVALID_JSON", "JSON inválido.");
  }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.APP_URL || "http://localhost:3000")
    .origin;
  if (origin !== expected)
    throw new ApiError(403, "ORIGIN", "Origem não autorizada.");
}
