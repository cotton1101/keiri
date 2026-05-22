export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // S3 (任意): 全て設定されている場合のみレシートをS3保存。未設定なら base64 で DB 保存。
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3Region: process.env.S3_REGION ?? "",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID ?? "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY ?? "",
  s3Endpoint: process.env.S3_ENDPOINT ?? "", // S3互換ストレージ用(任意)
  // Admin seed credentials (in-memory dev mode only)
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@example.com",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  adminName: process.env.ADMIN_NAME ?? "管理者",
  // Allowed origins for Stripe redirects
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "").split(",").filter(Boolean),
};
