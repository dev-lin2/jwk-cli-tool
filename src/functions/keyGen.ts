import { generateKeyPairSync } from "crypto";

export type Algorithm = "ES256" | "ES384" | "ES512" | "RS256" | "RS384" | "RS512";
export type KeyType = "EC" | "RSA";

export const DEFAULT_ALGORITHM: Algorithm = "ES256";
export const ALL_ALGORITHMS: Algorithm[] = ["ES256", "ES384", "ES512", "RS256", "RS384", "RS512"];
export const EC_ALGORITHMS: Algorithm[] = ["ES256", "ES384", "ES512"];
export const RSA_ALGORITHMS: Algorithm[] = ["RS256", "RS384", "RS512"];

const EC_CURVE_BY_ALGORITHM: Record<"ES256" | "ES384" | "ES512", string> = {
  ES256: "P-256",
  ES384: "P-384",
  ES512: "P-521"
};

const RSA_SIZE_BY_ALGORITHM: Record<"RS256" | "RS384" | "RS512", number> = {
  RS256: 2048,
  RS384: 3072,
  RS512: 4096
};

export function isEcAlgorithm(algorithm: Algorithm): algorithm is "ES256" | "ES384" | "ES512" {
  return algorithm.startsWith("ES");
}

export function generatePemKeyPair(algorithm: Algorithm): { privatePem: string; publicPem: string } {
  if (isEcAlgorithm(algorithm)) {
    const { privateKey, publicKey } = generateKeyPairSync("ec", {
      namedCurve: EC_CURVE_BY_ALGORITHM[algorithm]
    });

    return {
      privatePem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
      publicPem: publicKey.export({ type: "spki", format: "pem" }).toString()
    };
  }

  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: RSA_SIZE_BY_ALGORITHM[algorithm]
  });

  return {
    privatePem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicPem: publicKey.export({ type: "spki", format: "pem" }).toString()
  };
}
