import { input, select } from "@inquirer/prompts";
import path from "path";
import {
  groupPemPairs,
  jwkFilePath,
  KEYS_DIR,
  listPemFiles,
  readTextFile,
  relativeToRoot,
  writeJson
} from "../functions/fileUtils";
import { Algorithm, RSA_ALGORITHMS } from "../functions/keyGen";
import { convertPemPairToJwks, detectAlgorithmFromPem, KeyUse } from "../functions/pemToJwk";
import { promptForAlgorithm, runGenerateKeyFlow } from "./generateKey";

interface ExistingPemSelection {
  name: string;
  privatePath: string;
  publicPath: string;
}

function deriveNameFromPemFile(fileName: string): string {
  if (fileName.endsWith(".private.pem")) {
    return fileName.slice(0, -".private.pem".length);
  }

  if (fileName.endsWith(".public.pem")) {
    return fileName.slice(0, -".public.pem".length);
  }

  if (fileName.endsWith(".pem")) {
    return fileName.slice(0, -".pem".length);
  }

  return fileName;
}

async function selectExistingPemFiles(): Promise<ExistingPemSelection | null> {
  const files = await listPemFiles();
  if (files.length === 0) {
    return null;
  }

  const grouped = groupPemPairs(files);

  if (grouped.pairs.length > 0) {
    const selectedName = await select({
      message: "Select key pair from /keys:",
      choices: grouped.pairs.map((pair) => ({
        name: pair.name,
        value: pair.name
      }))
    });

    const selectedPair = grouped.pairs.find((pair) => pair.name === selectedName);
    if (!selectedPair) {
      throw new Error("Selected pair could not be resolved.");
    }

    return {
      name: selectedPair.name,
      privatePath: path.join(KEYS_DIR, selectedPair.privateFile),
      publicPath: path.join(KEYS_DIR, selectedPair.publicFile)
    };
  }

  const privateCandidates = [...grouped.privateOnly, ...grouped.otherPem];
  const publicCandidates = [...grouped.publicOnly, ...grouped.otherPem];

  if (privateCandidates.length === 0 || publicCandidates.length === 0) {
    throw new Error("Could not find both private and public PEM files.");
  }

  const privateFile = await select({
    message: "Select private PEM file:",
    choices: privateCandidates.map((file) => ({ name: file, value: file }))
  });

  const publicFile = await select({
    message: "Select public PEM file:",
    choices: publicCandidates
      .filter((file) => file !== privateFile)
      .map((file) => ({ name: file, value: file }))
  });

  const privateName = deriveNameFromPemFile(privateFile as string);
  const publicName = deriveNameFromPemFile(publicFile as string);
  const defaultName = privateName || publicName || "key";

  const nameInput = await input({
    message: "Output file name prefix:",
    default: privateName === publicName ? defaultName : `${privateName}-${publicName}`,
    validate: (value) => (value.trim() ? true : "Name is required.")
  });

  return {
    name: nameInput.trim(),
    privatePath: path.join(KEYS_DIR, privateFile as string),
    publicPath: path.join(KEYS_DIR, publicFile as string)
  };
}

export async function runGenerateJwkFlow(): Promise<void> {
  const source = await select({
    message: "How do you want to provide the PEM keys?",
    choices: [
      {
        name: "Generate new PEM key pair (then use it)",
        value: "generate-new"
      },
      {
        name: "Use existing PEM file from /keys folder",
        value: "use-existing"
      }
    ]
  });

  let name: string;
  let privatePem: string;
  let publicPem: string;
  let algorithm: Algorithm | undefined;

  if (source === "generate-new") {
    const generated = await runGenerateKeyFlow();
    name = generated.name;
    algorithm = generated.algorithm;
    [privatePem, publicPem] = await Promise.all([
      readTextFile(generated.privatePath),
      readTextFile(generated.publicPath)
    ]);
  } else {
    const selected = await selectExistingPemFiles();
    if (!selected) {
      console.log('\nNo .pem files found in /keys folder. Please generate one first.\n');
      return;
    }

    name = selected.name;
    [privatePem, publicPem] = await Promise.all([
      readTextFile(selected.privatePath),
      readTextFile(selected.publicPath)
    ]);
    algorithm = detectAlgorithmFromPem(publicPem);

    if (!algorithm) {
      algorithm = await promptForAlgorithm(RSA_ALGORITHMS, "RS256");
    }
  }

  const use = await select<KeyUse>({
    message: "Key use (use):",
    choices: [
      { name: "Signature (sig)", value: "sig" },
      { name: "Encryption (enc)", value: "enc" }
    ],
    default: "sig"
  });

  const kidInput = await input({
    message: "kid (leave blank to use key name):",
    default: name
  });
  const kid = kidInput.trim() || name;

  const { privateJwk, publicJwk } = convertPemPairToJwks(privatePem, publicPem, algorithm, kid, use);
  const privateOutputPath = jwkFilePath(name, "private");
  const publicOutputPath = jwkFilePath(name, "public");

  await Promise.all([
    writeJson(privateOutputPath, privateJwk),
    writeJson(publicOutputPath, publicJwk)
  ]);

  console.log("\nPublic JWK preview:");
  console.log(JSON.stringify(publicJwk, null, 2));
  console.log("\nGenerated JWK files.");
  console.log(`Private JWK: ${relativeToRoot(privateOutputPath)}`);
  console.log(`Public JWK : ${relativeToRoot(publicOutputPath)}\n`);
}
