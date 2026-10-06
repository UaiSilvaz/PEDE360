import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { ApiError, sameOrigin } from "@/lib/api";
import { can, type Permission } from "./permissions";
const cookieName = "menuflow_session";
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function session() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) throw new ApiError(401, "AUTH_REQUIRED", "Entre na sua conta.");
  const entry = await db.session.findUnique({
    where: { id: digest(token) },
    include: { user: { include: { merchant: true } } },
  });
  if (!entry || entry.expiresAt < new Date())
    throw new ApiError(401, "AUTH_REQUIRED", "Sua sessão expirou.");
  return entry.user;
}
export async function authorize(request: Request, permission?: Permission) {
  if (!["GET", "HEAD"].includes(request.method)) sameOrigin(request);
  const user = await session();
  if (permission && !can(user.role, permission))
    throw new ApiError(403, "FORBIDDEN", "Sem permissão para esta ação.");
  return user;
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 86400_000);
  await db.session.create({ data: { id: digest(token), userId, expiresAt } });
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) await db.session.deleteMany({ where: { id: digest(token) } });
  jar.delete(cookieName);
}
