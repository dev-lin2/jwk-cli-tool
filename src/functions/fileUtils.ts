import { access, mkdir, readFile, readdir, writeFile } from "fs/promises";
import path from "path";

export const PROJECT_ROOT = process.cwd();
export const KEYS_DIR = path.join(PROJECT_ROOT, "keys");
export const OUTPUTS_DIR = path.join(PROJECT_ROOT, "outputs");

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

export async function ensureProjectDirs(): Promise<void> {
  await Promise.all([ensureDir(KEYS_DIR), ensureDir(OUTPUTS_DIR)]);
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
  await ensureDir(KEYS_DIR);
  const entries = await readdir(KEYS_DIR, { withFileTypes: true });

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
  return path.join(KEYS_DIR, `${name}.${visibility}.pem`);
}

export function jwkFilePath(name: string, visibility: "private" | "public"): string {
  return path.join(OUTPUTS_DIR, `${name}.${visibility}.jwk.json`);
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
  return path.relative(PROJECT_ROOT, filePath);
}

