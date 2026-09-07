import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { signJwt, verifyJwt } from "../../src/utils/jwt.js";

const TEST_SECRET = "test-secret-key-that-is-at-least-32-characters-long";
const TEST_ISSUER = "kite-test";

describe("JWT Utilities", () => {
  describe("signJwt", () => {
    it("produces a valid 3-part token (header.payload.signature)", () => {
      const token = signJwt({ sub: "user-1" }, TEST_SECRET);
      const parts = token.split(".");
      assert.equal(parts.length, 3);
      // Each part should be non-empty
      for (const part of parts) {
        assert.ok(part.length > 0);
      }
    });

    it("sets correct iat and exp timestamps", () => {
      const before = Math.floor(Date.now() / 1000);
      const token = signJwt({ sub: "user-1" }, TEST_SECRET, 7200);
      const after = Math.floor(Date.now() / 1000);

      const result = verifyJwt(token, TEST_SECRET);
      assert.ok(result.valid);
      assert.ok(result.payload);
      assert.ok(result.payload.iat! >= before);
      assert.ok(result.payload.iat! <= after);
      assert.equal(result.payload.exp! - result.payload.iat!, 7200);
    });
  });

  describe("verifyJwt", () => {
    it("returns valid=true for a freshly signed token", () => {
      const token = signJwt({ sub: "user-1" }, TEST_SECRET);
      const result = verifyJwt(token, TEST_SECRET);
      assert.equal(result.valid, true);
      assert.ok(result.payload);
    });

    it("returns the correct payload (sub, iss, custom claims)", () => {
      const token = signJwt(
        { sub: "user-42", iss: TEST_ISSUER, role: "admin" },
        TEST_SECRET
      );
      const result = verifyJwt(token, TEST_SECRET);
      assert.ok(result.valid);
      assert.equal(result.payload!.sub, "user-42");
      assert.equal(result.payload!.iss, TEST_ISSUER);
      assert.equal(result.payload!.role, "admin");
    });

    it("rejects a token with a tampered payload", () => {
      const token = signJwt({ sub: "user-1" }, TEST_SECRET);
      const parts = token.split(".");
      // Tamper with the payload by changing a character
      const tamperedPayload = Buffer.from(
        JSON.stringify({ sub: "user-HACKED", iat: 0, exp: 9999999999 }),
        "utf-8"
      ).toString("base64url");
      const tampered = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
      const result = verifyJwt(tampered, TEST_SECRET);
      assert.equal(result.valid, false);
      assert.equal(result.error, "Invalid signature");
    });

    it("rejects a token with a wrong secret", () => {
      const token = signJwt({ sub: "user-1" }, TEST_SECRET);
      const result = verifyJwt(token, "wrong-secret-that-is-also-32-chars-long");
      assert.equal(result.valid, false);
      assert.equal(result.error, "Invalid signature");
    });

    it("rejects an expired token (exp in the past)", () => {
      // Sign with -10 seconds expiry (already expired)
      const token = signJwt({ sub: "user-1" }, TEST_SECRET, -10);
      const result = verifyJwt(token, TEST_SECRET);
      assert.equal(result.valid, false);
      assert.equal(result.error, "Token expired");
    });

    it("rejects a token with wrong issuer", () => {
      const token = signJwt(
        { sub: "user-1", iss: "wrong-issuer" },
        TEST_SECRET
      );
      const result = verifyJwt(token, TEST_SECRET, TEST_ISSUER);
      assert.equal(result.valid, false);
      assert.equal(result.error, "Invalid issuer");
    });
  });
});
