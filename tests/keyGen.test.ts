import { createPrivateKey, createPublicKey } from "crypto";
import { describe, expect, it } from "vitest";
import { generatePemKeyPair, isEcAlgorithm } from "../src/functions/keyGen";

describe("keyGen", () => {
  it("generates valid ES256 PEM keys", () => {
    const { privatePem, publicPem } = generatePemKeyPair("ES256");

    expect(privatePem).toContain("BEGIN PRIVATE KEY");
    expect(publicPem).toContain("BEGIN PUBLIC KEY");

    const publicJwk = createPublicKey(publicPem).export({ format: "jwk" }) as {
      kty: string;
      crv?: string;
    };
    const privateJwk = createPrivateKey(privatePem).export({ format: "jwk" }) as {
      kty: string;
      d?: string;
    };

    expect(publicJwk.kty).toBe("EC");
    expect(publicJwk.crv).toBe("P-256");
    expect(privateJwk.kty).toBe("EC");
    expect(typeof privateJwk.d).toBe("string");
  });

  it("generates valid RS256 PEM keys", () => {
    const { publicPem } = generatePemKeyPair("RS256");
    const publicJwk = createPublicKey(publicPem).export({ format: "jwk" }) as {
      kty: string;
      n?: string;
      e?: string;
    };

    expect(publicJwk.kty).toBe("RSA");
    expect(typeof publicJwk.n).toBe("string");
    expect(typeof publicJwk.e).toBe("string");
  });

  it("detects EC algorithms by prefix", () => {
    expect(isEcAlgorithm("ES256")).toBe(true);
    expect(isEcAlgorithm("ES384")).toBe(true);
    expect(isEcAlgorithm("RS256")).toBe(false);
  });
});

