import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateKey } from "@/lib/storage/provider";
export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  if (process.env.NODE_ENV === "production")
    return new Response(null, { status: 404 });
  try {
    const key = validateKey((await context.params).key.join("/"));
    const data = await readFile(
      path.join(process.cwd(), ".local/uploads", key),
    );
    return new Response(data, {
      headers: {
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public,max-age=31536000,immutable",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
