import { createPrivateKey, createPublicKey, KeyObject } from "crypto";
import { Algorithm } from "./keyGen";

export type KeyUse = "sig" | "enc";

export type Jwk = Record<string, unknown> & {
  kty?: string;
  crv?: string;
  use?: string;
  alg?: string;
  kid?: string;
};

const EC_ALGORITHM_BY_CURVE: Record<string, Algorithm> = {
  "P-256": "ES256",
  "P-384": "ES384",
  "P-521": "ES512"
};

function exportJwk(keyObject: KeyObject): Jwk {
  return keyObject.export({ format: "jwk" }) as unknown as Jwk;
}

function withMetadata(jwk: Jwk, algorithm: Algorithm, kid: string, use: KeyUse): Jwk {
  return {
    ...jwk,
    use,
    alg: algorithm,
    kid
  };
}

export function detectAlgorithmFromPem(publicPem: string): Algorithm | undefined {
  const publicKey = createPublicKey(publicPem);
  const jwk = exportJwk(publicKey);

  if (jwk.kty === "EC" && typeof jwk.crv === "string") {
    return EC_ALGORITHM_BY_CURVE[jwk.crv];
  }

  return undefined;
}

export function convertPemPairToJwks(
  privatePem: string,
  publicPem: string,
  algorithm: Algorithm,
  kid: string,
  use: KeyUse = "sig"
): { privateJwk: Jwk; publicJwk: Jwk } {
  const privateKey = createPrivateKey(privatePem);
  const publicKey = createPublicKey(publicPem);

  const privateJwk = withMetadata(exportJwk(privateKey), algorithm, kid, use);
  const publicJwk = withMetadata(exportJwk(publicKey), algorithm, kid, use);

  // Public JWK should never expose private parameters even if a malformed key slips in.
  for (const privateField of ["d", "p", "q", "dp", "dq", "qi", "oth"]) {
    delete publicJwk[privateField];
  }

  return { privateJwk, publicJwk };
}
