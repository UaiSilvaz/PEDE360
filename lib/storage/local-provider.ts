import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { validateKey, type StorageProvider } from "./provider";
export class LocalProvider implements StorageProvider {
  private root = path.resolve(process.cwd(), ".local/uploads");
  private file(key: string) {
    return path.join(this.root, validateKey(key));
  }
  async upload(key: string, content: Buffer) {
    const file = this.file(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
    return { key, url: this.getPublicUrl(key) };
  }
  async delete(key: string) {
    try {
      await unlink(this.file(key));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }
  getPublicUrl(key: string) {
    return "/api/media/" + validateKey(key);
  }
}
