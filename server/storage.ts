// S3 (or S3互換) ストレージヘルパ。
// 全ての S3 認証情報が環境変数で設定されている場合のみ有効。
// 未設定の場合は isStorageConfigured() が false を返し、呼び出し側は base64 保存にフォールバックする。

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

export function isStorageConfigured(): boolean {
  return Boolean(ENV.s3Bucket && ENV.s3Region && ENV.s3AccessKeyId && ENV.s3SecretAccessKey);
}

let _client: S3Client | null = null;
function getClient(): S3Client {
  if (!isStorageConfigured()) {
    throw new Error("S3 storage is not configured");
  }
  if (!_client) {
    _client = new S3Client({
      region: ENV.s3Region,
      credentials: { accessKeyId: ENV.s3AccessKeyId, secretAccessKey: ENV.s3SecretAccessKey },
      ...(ENV.s3Endpoint ? { endpoint: ENV.s3Endpoint, forcePathStyle: true } : {}),
    });
  }
  return _client;
}

export async function storagePutObject(key: string, body: Buffer | Uint8Array, contentType: string): Promise<string> {
  const client = getClient();
  await client.send(new PutObjectCommand({ Bucket: ENV.s3Bucket, Key: key, Body: body, ContentType: contentType }));
  return key;
}

// 一時的な署名付き取得URLを発行（既定1時間）
export async function storageGetSignedUrl(key: string, expiresInSec = 3600): Promise<string> {
  const client = getClient();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key }), { expiresIn: expiresInSec });
}

export async function storageDeleteObject(key: string): Promise<void> {
  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: ENV.s3Bucket, Key: key }));
}
