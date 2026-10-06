export interface StorageProvider {
  upload(
    key: string,
    content: Buffer,
    contentType: string,
  ): Promise<{ key: string; url: string }>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}
export function validateKey(key: string) {
  if (!/^[a-zA-Z0-9_-]+\/[a-z-]+\/[a-zA-Z0-9_-]+\.webp$/.test(key))
    throw new Error("Chave de arquivo inválida.");
  return key;
}
