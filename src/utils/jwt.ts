import crypto from "node:crypto";

export interface JwtHeader {
  alg: string;
  typ: string;
}

export interface JwtPayload {
  sub?: string;
  iss?: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

export interface JwtVerifyResult {
  valid: boolean;
  payload?: JwtPayload;
  error?: string;
}

function base64UrlEncode(data: Buffer): string {
  return data.toString("base64url");
}

function base64UrlDecode(str: string): Buffer {
  return Buffer.from(str, "base64url");
}

export function signJwt(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSeconds: number = 3600
): string {
  const header: JwtHeader = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);

  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const headerB64 = base64UrlEncode(
    Buffer.from(JSON.stringify(header), "utf-8")
  );
  const payloadB64 = base64UrlEncode(
    Buffer.from(JSON.stringify(fullPayload), "utf-8")
  );

  const signatureInput = `${headerB64}.${payloadB64}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signatureInput)
    .digest();
  const signatureB64 = base64UrlEncode(signature);

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

export function verifyJwt(
  token: string,
  secret: string,
  expectedIssuer?: string
): JwtVerifyResult {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, error: "Invalid token format" };
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Verify signature
  const signatureInput = `${headerB64}.${payloadB64}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signatureInput)
    .digest();
  const actualSignature = base64UrlDecode(signatureB64);

  if (expectedSignature.length !== actualSignature.length) {
    return { valid: false, error: "Invalid signature" };
  }

  if (!crypto.timingSafeEqual(expectedSignature, actualSignature)) {
    return { valid: false, error: "Invalid signature" };
  }

  // Decode payload
  let payload: JwtPayload;
  try {
    payload = JSON.parse(
      base64UrlDecode(payloadB64).toString("utf-8")
    ) as JwtPayload;
  } catch {
    return { valid: false, error: "Invalid payload encoding" };
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp !== undefined && payload.exp < now) {
    return { valid: false, error: "Token expired" };
  }

  // Check issuer
  if (expectedIssuer !== undefined && payload.iss !== expectedIssuer) {
    return { valid: false, error: "Invalid issuer" };
  }

  return { valid: true, payload };
}
