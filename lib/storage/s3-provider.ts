import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { validateKey, type StorageProvider } from "./provider";
export class S3Provider implements StorageProvider {
  private client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || "auto",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
  async upload(key: string, content: Buffer, contentType: string) {
    validateKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: content,
        ContentType: contentType,
        CacheControl: "public,max-age=31536000,immutable",
      }),
    );
    return { key, url: this.getPublicUrl(key) };
  }
  async delete(key: string) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: validateKey(key),
      }),
    );
  }
  getPublicUrl(key: string) {
    return (
      process.env.S3_PUBLIC_URL!.replace(/\/$/, "") + "/" + validateKey(key)
    );
  }
}
