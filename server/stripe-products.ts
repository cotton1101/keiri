/**
 * Stripe Product & Price definitions for カンタン経理
 * Centralized product configuration for consistency
 */

export const PLANS = {
  free: {
    name: "フリープラン",
    description: "個人事業主の経理をはじめよう",
    price: 0,
    features: [
      "取引入力（月15件まで）",
      "基本レポート",
      "勘定科目管理",
    ],
  },
  premium: {
    name: "プレミアムプラン",
    description: "本格的な経理・確定申告をサポート",
    price: 1280,
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID || "", // Set after creating in Stripe
    features: [
      "取引入力（無制限）",
      "確定申告（青色・白色）",
      "税金シミュレーション",
      "請求書作成・メール送信",
      "固定費・定期取引管理",
      "データインポート",
      "全レポート閲覧",
      "優先サポート",
    ],
  },
} as const;

export const STRIPE_CONFIG = {
  currency: "jpy",
  premiumPriceAmount: 1280,
  trialDays: 0,
} as const;
