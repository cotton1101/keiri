import nodemailer from "nodemailer";

const APP_NAME = "カンタン経理";
const MAIL_FROM = process.env.SMTP_FROM || "info@sns-tool.online";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const PHP_MAIL_URL = "https://sns-tool.online/keiri/server/send_mail.php";
const PHP_MAIL_KEY = process.env.PHP_MAIL_KEY || "";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  // In dev/test without SMTP credentials, log and return success
  if (!process.env.SMTP_PASS && !PHP_MAIL_KEY) {
    console.log(`[MAIL-DEV] Would send to ${to}: ${subject}`);
    return true;
  }

  // Try PHP mail proxy first
  if (PHP_MAIL_KEY) {
    try {
      const response = await fetch(PHP_MAIL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, html, from: MAIL_FROM, key: PHP_MAIL_KEY }),
      });
      const result = await response.json();
      if (result.success) {
        console.log(`[MAIL-PHP] Sent to ${to}: ${subject}`);
        return true;
      }
    } catch (err: unknown) {
      console.warn(`[MAIL-PHP] Proxy error for ${to}:`, (err as Error).message);
    }
  }

  // Fallback to SMTP via nodemailer
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "sv16817.xserver.jp",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: (process.env.SMTP_SECURE || "false") === "true",
      auth: {
        user: process.env.SMTP_USER || MAIL_FROM,
        pass: process.env.SMTP_PASS || "",
      },
    });
    await transporter.sendMail({
      from: `"${APP_NAME}" <${MAIL_FROM}>`,
      to,
      subject,
      html,
    });
    console.log(`[MAIL-SMTP] Sent to ${to}: ${subject}`);
    return true;
  } catch (err: unknown) {
    console.error(`[MAIL] Failed to send to ${to}:`, (err as Error).message);
    return false;
  }
}

/** Send in background (non-blocking) */
export function sendMailAsync(to: string, subject: string, html: string): void {
  sendMail(to, subject, html).catch(() => {});
}

// ─── Email Templates ───

const basePath = (process.env.BASE_PATH || "/").replace(/\/$/, "") || "";
const appUrl = `https://sns-tool.online${basePath}`;

function emailWrapper(content: string): string {
  return `
  <div style="font-family: 'Helvetica Neue', Arial, 'Noto Sans JP', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #10B981; font-size: 28px; margin: 0;">${APP_NAME}</h1>
      <p style="color: #64748B; font-size: 12px; margin: 4px 0 0 0;">個人事業主のためのクラウド経理ソフト</p>
    </div>
    ${content}
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="color: #CBD5E1; font-size: 11px; text-align: center;">&copy; 2026 ${APP_NAME}. All rights reserved.</p>
  </div>`;
}

/** ユーザー向け: 会員登録完了 */
export function sendWelcomeEmail(email: string, name?: string): void {
  sendMailAsync(
    email,
    `【${APP_NAME}】会員登録完了のお知らせ`,
    emailWrapper(`
      <h2 style="color: #1E293B; font-size: 20px;">ようこそ！</h2>
      <p style="color: #334155;">${name ? escapeHtml(name) + "さん、" : ""}この度は${APP_NAME}にご登録いただき、誠にありがとうございます。</p>
      <p style="color: #334155;">アカウントの作成が正常に完了いたしました。さっそく取引の記録を始めましょう。</p>
      <div style="background: linear-gradient(135deg, #10B981, #059669); border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
        <a href="${appUrl}/dashboard" style="color: white; text-decoration: none; font-weight: bold; font-size: 16px;">ダッシュボードを開く →</a>
      </div>
      <p style="color: #94A3B8; font-size: 13px;">※ 本メールに心当たりがない場合は、お手数ですが破棄をお願いいたします。</p>
    `)
  );
}

/** 管理者向け: 新規会員登録通知 */
export function sendAdminNewUserNotification(email: string, name?: string): void {
  const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  sendMailAsync(
    ADMIN_EMAIL,
    `【${APP_NAME}管理】新規会員登録がありました`,
    emailWrapper(`
      <h2 style="color: #3B82F6;">新規会員登録通知</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; font-weight: bold; width: 120px;">名前</td>
          <td style="padding: 8px 12px; border: 1px solid #E2E8F0;">${escapeHtml(name || "未設定")}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; font-weight: bold;">メール</td>
          <td style="padding: 8px 12px; border: 1px solid #E2E8F0;">${escapeHtml(email)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; font-weight: bold;">登録日時</td>
          <td style="padding: 8px 12px; border: 1px solid #E2E8F0;">${now}</td>
        </tr>
      </table>
      <div style="background: #F1F5F9; border-radius: 8px; padding: 12px; margin-top: 16px;">
        <a href="${appUrl}/admin" style="color: #3B82F6;">管理画面を開く →</a>
      </div>
    `)
  );
}

/** 管理者向け: 有料プラン変更通知 */
export function sendAdminPlanUpgradeNotification(
  userEmail: string,
  userName: string,
  plan: string
): void {
  const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  const planLabels: Record<string, string> = {
    premium: "プレミアム（¥1,280/月）",
  };
  sendMailAsync(
    ADMIN_EMAIL,
    `【${APP_NAME}管理】有料プラン変更がありました`,
    emailWrapper(`
      <h2 style="color: #10B981;">有料プラン変更通知</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; font-weight: bold; width: 120px;">ユーザー名</td>
          <td style="padding: 8px 12px; border: 1px solid #E2E8F0;">${escapeHtml(userName)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; font-weight: bold;">メール</td>
          <td style="padding: 8px 12px; border: 1px solid #E2E8F0;">${escapeHtml(userEmail)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; font-weight: bold;">プラン</td>
          <td style="padding: 8px 12px; border: 1px solid #E2E8F0; color: #10B981; font-weight: bold;">${planLabels[plan] || plan}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; font-weight: bold;">変更日時</td>
          <td style="padding: 8px 12px; border: 1px solid #E2E8F0;">${now}</td>
        </tr>
      </table>
      <div style="background: #F1F5F9; border-radius: 8px; padding: 12px; margin-top: 16px;">
        <a href="${appUrl}/admin" style="color: #3B82F6;">管理画面を開く →</a>
      </div>
    `)
  );
}

/** 請求書メール送信（PDF添付用） */
export async function sendInvoiceEmail(
  to: string,
  toName: string,
  subject: string,
  body: string,
  fromBusinessName?: string
): Promise<boolean> {
  return sendMail(
    to,
    subject,
    emailWrapper(`
      <h2 style="color: #1E293B; font-size: 20px;">${escapeHtml(subject)}</h2>
      ${toName ? `<p style="color: #334155;">${escapeHtml(toName)} 様</p>` : ""}
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0; white-space: pre-wrap; line-height: 1.6;">
        <p style="color: #475569; font-size: 14px; margin: 0;">${escapeHtml(body)}</p>
      </div>
      ${fromBusinessName ? `<p style="color: #94A3B8; font-size: 13px;">${escapeHtml(fromBusinessName)}</p>` : ""}
    `)
  );
}

/** 管理者向け: サブスクキャンセル通知 */
export function sendAdminCancellationNotification(
  stripeSubId: string
): void {
  const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  sendMailAsync(
    ADMIN_EMAIL,
    `【${APP_NAME}管理】サブスクリプションがキャンセルされました`,
    emailWrapper(`
      <h2 style="color: #EF4444;">サブスクキャンセル通知</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; font-weight: bold; width: 160px;">Stripe Subscription ID</td>
          <td style="padding: 8px 12px; border: 1px solid #E2E8F0;">${escapeHtml(stripeSubId)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; font-weight: bold;">キャンセル日時</td>
          <td style="padding: 8px 12px; border: 1px solid #E2E8F0;">${now}</td>
        </tr>
      </table>
    `)
  );
}
