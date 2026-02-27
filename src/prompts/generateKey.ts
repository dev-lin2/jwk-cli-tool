import { confirm, input, select } from "@inquirer/prompts";
import {
  ALL_ALGORITHMS,
  Algorithm,
  DEFAULT_ALGORITHM,
  EC_ALGORITHMS,
  generatePemKeyPair,
  KeyType,
  RSA_ALGORITHMS
} from "../functions/keyGen";
import {
  fileExists,
  keyFilePath,
  relativeToRoot,
  writePem
} from "../functions/fileUtils";

export interface GeneratedKeyResult {
  name: string;
  algorithm: Algorithm;
  privatePath: string;
  publicPath: string;
}

const ALGORITHM_LABELS: Record<Algorithm, string> = {
  ES256: "ES256 (EC P-256)",
  ES384: "ES384 (EC P-384)",
  ES512: "ES512 (EC P-521)",
  RS256: "RS256 (RSA 2048-bit)",
  RS384: "RS384 (RSA 3072-bit)",
  RS512: "RS512 (RSA 4096-bit)"
};

const KEY_TYPE_LABELS: Record<KeyType, string> = {
  EC: "EC (Elliptic Curve)",
  RSA: "RSA"
};

function normalizeName(value: string): string {
  return value.trim();
}

async function promptForKeyName(): Promise<string> {
  while (true) {
    const rawName = await input({
      message: "Key name (used as filename prefix):",
      validate: (value) => {
        if (!value.trim()) {
          return "Key name is required.";
        }

        if (!/^[A-Za-z0-9._-]+$/.test(value.trim())) {
          return "Use only letters, numbers, dot, underscore, or hyphen.";
        }

        return true;
      }
    });

    const name = normalizeName(rawName);
    const privatePath = keyFilePath(name, "private");
    const publicPath = keyFilePath(name, "public");
    const [privateExists, publicExists] = await Promise.all([
      fileExists(privatePath),
      fileExists(publicPath)
    ]);

    if (!privateExists && !publicExists) {
      return name;
    }

    const overwrite = await confirm({
      message: `Key files for "${name}" already exist. Overwrite them?`,
      default: false
    });

    if (overwrite) {
      return name;
    }
  }
}

export async function promptForAlgorithm(
  allowed: Algorithm[] = ALL_ALGORITHMS,
  defaultValue: Algorithm = DEFAULT_ALGORITHM
): Promise<Algorithm> {
  const selected = await select({
    message: "Algorithm:",
    choices: allowed.map((algorithm) => ({
      name: ALGORITHM_LABELS[algorithm],
      value: algorithm
    })),
    default: defaultValue
  });

  return selected as Algorithm;
}

export async function promptForKeyType(defaultValue: KeyType = "EC"): Promise<KeyType> {
  const selected = await select({
    message: "Key type (kty):",
    choices: (["EC", "RSA"] as KeyType[]).map((keyType) => ({
      name: KEY_TYPE_LABELS[keyType],
      value: keyType
    })),
    default: defaultValue
  });

  return selected as KeyType;
}

export async function runGenerateKeyFlow(): Promise<GeneratedKeyResult> {
  const name = await promptForKeyName();
  const keyType = await promptForKeyType();
  const algorithm = keyType === "EC"
    ? await promptForAlgorithm(EC_ALGORITHMS, "ES256")
    : await promptForAlgorithm(RSA_ALGORITHMS, "RS256");
  const { privatePem, publicPem } = generatePemKeyPair(algorithm);

  const privatePath = keyFilePath(name, "private");
  const publicPath = keyFilePath(name, "public");

  await Promise.all([
    writePem(privatePath, privatePem),
    writePem(publicPath, publicPem)
  ]);

  console.log(`\nGenerated PEM key pair for "${name}".`);
  console.log(`Private key: ${relativeToRoot(privatePath)}`);
  console.log(`Public key : ${relativeToRoot(publicPath)}\n`);

  return {
    name,
    algorithm,
    privatePath,
    publicPath
  };
}
