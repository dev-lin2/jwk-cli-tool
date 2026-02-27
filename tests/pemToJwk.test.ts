import { describe, expect, it } from "vitest";
import { generatePemKeyPair } from "../src/functions/keyGen";
import { convertPemPairToJwks, detectAlgorithmFromPem } from "../src/functions/pemToJwk";

describe("pemToJwk", () => {
  it("detects EC algorithm from public PEM", () => {
    const { publicPem } = generatePemKeyPair("ES384");
    const detected = detectAlgorithmFromPem(publicPem);
    expect(detected).toBe("ES384");
  });

  it("returns undefined for RSA algorithm detection", () => {
    const { publicPem } = generatePemKeyPair("RS256");
    const detected = detectAlgorithmFromPem(publicPem);
    expect(detected).toBeUndefined();
  });

  it("converts PEM pair to JWK pair with metadata and public key sanitization", () => {
    const { privatePem, publicPem } = generatePemKeyPair("ES256");
    const { privateJwk, publicJwk } = convertPemPairToJwks(
      privatePem,
      publicPem,
      "ES256",
      "my-key-id",
      "enc"
    );

    expect(privateJwk.alg).toBe("ES256");
    expect(privateJwk.kid).toBe("my-key-id");
    expect(privateJwk.use).toBe("enc");
    expect(typeof privateJwk.d).toBe("string");

    expect(publicJwk.alg).toBe("ES256");
    expect(publicJwk.kid).toBe("my-key-id");
    expect(publicJwk.use).toBe("enc");
    expect(publicJwk.d).toBeUndefined();
  });

  it("defaults JWK use to sig", () => {
    const { privatePem, publicPem } = generatePemKeyPair("RS256");
    const { publicJwk } = convertPemPairToJwks(privatePem, publicPem, "RS256", "rsa-kid");

    expect(publicJwk.use).toBe("sig");
  });
});

