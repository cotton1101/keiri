import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import bcrypt from "bcryptjs";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../drizzle/schema";
import * as db from "./db";
import { ENV } from "./_core/env";

const SALT_ROUNDS = 12;

export type SessionPayload = {
  userId: number;
  openId: string;
  email: string;
};

function getSessionSecret() {
  const secret = ENV.cookieSecret;
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: { id: number; openId: string; email: string | null }): Promise<string> {
  const secretKey = getSessionSecret();
  const issuedAt = Date.now();
  const expirationSeconds = Math.floor((issuedAt + ONE_YEAR_MS) / 1000);

  return new SignJWT({
    userId: user.id,
    openId: user.openId,
    email: user.email || "",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const secretKey = getSessionSecret();
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    const { userId, openId, email } = payload as Record<string, unknown>;
    if (!userId || !openId) return null;
    return {
      userId: userId as number,
      openId: openId as string,
      email: (email as string) || "",
    };
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  if (!cookieHeader) return new Map();
  const parsed = parseCookieHeader(cookieHeader);
  return new Map(Object.entries(parsed));
}

export async function authenticateRequest(req: Request): Promise<User | null> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionCookie = cookies.get(COOKIE_NAME);
  const session = await verifySessionToken(sessionCookie);
  if (!session) return null;

  const user = await db.getUserByOpenId(session.openId);
  if (!user) return null;

  // Update lastSignedIn
  await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
  return user;
}

export async function registerUser(email: string, password: string, name: string): Promise<{ user: User; token: string }> {
  // Check if email already exists
  const existing = await db.getUserByEmail(email);
  if (existing) {
    throw new Error("このメールアドレスは既に登録されています");
  }

  const passwordHash = await hashPassword(password);
  const openId = `email-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

  await db.upsertUser({
    openId,
    name,
    email,
    passwordHash,
    loginMethod: "email",
    lastSignedIn: new Date(),
  });

  const user = await db.getUserByOpenId(openId);
  if (!user) throw new Error("ユーザーの作成に失敗しました");

  const token = await createSessionToken(user);
  return { user, token };
}

export async function loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
  const user = await db.getUserByEmail(email);
  if (!user) {
    throw new Error("メールアドレスまたはパスワードが正しくありません");
  }

  if (!user.passwordHash) {
    throw new Error("このアカウントはパスワード認証に対応していません。OAuth経由でログインしてください。");
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new Error("メールアドレスまたはパスワードが正しくありません");
  }

  // Update lastSignedIn
  await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });

  const token = await createSessionToken(user);
  return { user, token };
}
