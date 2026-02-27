import { access, mkdir, readFile, readdir, writeFile } from "fs/promises";
import path from "path";

export interface StorageConfig {
  rootDir: string;
  keysDir: string;
  outputsDir: string;
}

function buildStorageConfig(rootDir: string): StorageConfig {
  const resolvedRoot = path.resolve(rootDir);
  return {
    rootDir: resolvedRoot,
    keysDir: path.join(resolvedRoot, "keys"),
    outputsDir: path.join(resolvedRoot, "outputs")
  };
}

let storageConfig: StorageConfig = buildStorageConfig(process.cwd());

export interface PemPair {
  name: string;
  privateFile: string;
  publicFile: string;
}

export interface GroupedPemFiles {
  pairs: PemPair[];
  privateOnly: string[];
  publicOnly: string[];
  otherPem: string[];
}

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export function configureStorageRoot(rootDir: string): StorageConfig {
  storageConfig = buildStorageConfig(rootDir);
  return storageConfig;
}

export function getStorageConfig(): StorageConfig {
  return storageConfig;
}

export async function ensureProjectDirs(): Promise<void> {
  await Promise.all([ensureDir(storageConfig.keysDir), ensureDir(storageConfig.outputsDir)]);
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listPemFiles(): Promise<string[]> {
  await ensureDir(storageConfig.keysDir);
  const entries = await readdir(storageConfig.keysDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pem"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

export function groupPemPairs(files: string[]): GroupedPemFiles {
  const byName = new Map<string, { privateFile?: string; publicFile?: string }>();
  const otherPem: string[] = [];

  for (const file of files) {
    if (file.endsWith(".private.pem")) {
      const name = file.slice(0, -".private.pem".length);
      const current = byName.get(name) ?? {};
      current.privateFile = file;
      byName.set(name, current);
      continue;
    }

    if (file.endsWith(".public.pem")) {
      const name = file.slice(0, -".public.pem".length);
      const current = byName.get(name) ?? {};
      current.publicFile = file;
      byName.set(name, current);
      continue;
    }

    otherPem.push(file);
  }

  const pairs: PemPair[] = [];
  const privateOnly: string[] = [];
  const publicOnly: string[] = [];

  for (const [name, pair] of byName.entries()) {
    if (pair.privateFile && pair.publicFile) {
      pairs.push({ name, privateFile: pair.privateFile, publicFile: pair.publicFile });
      continue;
    }

    if (pair.privateFile) {
      privateOnly.push(pair.privateFile);
    }

    if (pair.publicFile) {
      publicOnly.push(pair.publicFile);
    }
  }

  pairs.sort((a, b) => a.name.localeCompare(b.name));
  privateOnly.sort((a, b) => a.localeCompare(b));
  publicOnly.sort((a, b) => a.localeCompare(b));
  otherPem.sort((a, b) => a.localeCompare(b));

  return { pairs, privateOnly, publicOnly, otherPem };
}

export function keyFilePath(name: string, visibility: "private" | "public"): string {
  return path.join(storageConfig.keysDir, `${name}.${visibility}.pem`);
}

export function jwkFilePath(name: string, visibility: "private" | "public"): string {
  return path.join(storageConfig.outputsDir, `${name}.${visibility}.jwk.json`);
}

export async function writeJson(filePath: string, obj: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

export async function writePem(filePath: string, pem: string): Promise<void> {
  await writeFile(filePath, pem, "utf8");
}

export async function readTextFile(filePath: string): Promise<string> {
  return readFile(filePath, "utf8");
}

export function relativeToRoot(filePath: string): string {
  return path.relative(storageConfig.rootDir, filePath);
}

export function resolveInKeysDir(fileName: string): string {
  return path.join(storageConfig.keysDir, fileName);
}
