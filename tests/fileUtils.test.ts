import { mkdtemp, readFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import {
  configureStorageRoot,
  ensureDir,
  fileExists,
  getStorageConfig,
  groupPemPairs,
  jwkFilePath,
  keyFilePath,
  readTextFile,
  relativeToRoot,
  writeJson,
  writePem
} from "../src/functions/fileUtils";

describe("fileUtils", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "jwk-cli-tool-tests-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("groups paired and unpaired PEM files correctly", () => {
    const grouped = groupPemPairs([
      "beta.public.pem",
      "alpha.public.pem",
      "alpha.private.pem",
      "solo.private.pem",
      "solo-public.public.pem",
      "random.pem"
    ]);

    expect(grouped.pairs).toEqual([
      {
        name: "alpha",
        privateFile: "alpha.private.pem",
        publicFile: "alpha.public.pem"
      }
    ]);
    expect(grouped.privateOnly).toEqual(["solo.private.pem"]);
    expect(grouped.publicOnly).toEqual(["beta.public.pem", "solo-public.public.pem"]);
    expect(grouped.otherPem).toEqual(["random.pem"]);
  });

  it("creates directories and checks file existence", async () => {
    const nestedDir = path.join(tempDir, "a", "b", "c");
    await ensureDir(nestedDir);

    expect(await fileExists(nestedDir)).toBe(true);
    expect(await fileExists(path.join(tempDir, "missing.txt"))).toBe(false);
  });

  it("writes and reads PEM content", async () => {
    const pemPath = path.join(tempDir, "sample.private.pem");
    const pem = "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n";

    await writePem(pemPath, pem);
    const read = await readTextFile(pemPath);

    expect(read).toBe(pem);
  });

  it("writes formatted JSON", async () => {
    const jsonPath = path.join(tempDir, "sample.json");
    const payload = { kty: "EC", alg: "ES256", nested: { ok: true } };

    await writeJson(jsonPath, payload);
    const written = await readFile(jsonPath, "utf8");

    expect(written.endsWith("\n")).toBe(true);
    expect(written).toContain('\n  "kty": "EC"');
    expect(JSON.parse(written)).toEqual(payload);
  });

  it("builds expected root-relative key and output paths", () => {
    const privateKeyPath = keyFilePath("demo", "private");
    const publicJwkPath = jwkFilePath("demo", "public");

    expect(privateKeyPath).toContain(path.join("keys", "demo.private.pem"));
    expect(publicJwkPath).toContain(path.join("outputs", "demo.public.jwk.json"));

    const relativeKeyPath = relativeToRoot(privateKeyPath);
    expect(relativeKeyPath).toBe(path.join("keys", "demo.private.pem"));
  });

  it("uses configured storage root for key and output directories", () => {
    const previous = getStorageConfig();
    const customRoot = path.join(tempDir, "custom-root");

    try {
      configureStorageRoot(customRoot);
      const config = getStorageConfig();
      const privateKeyPath = keyFilePath("app", "private");
      const publicJwkPath = jwkFilePath("app", "public");

      expect(config.rootDir).toBe(path.resolve(customRoot));
      expect(config.keysDir).toBe(path.join(path.resolve(customRoot), "keys"));
      expect(config.outputsDir).toBe(path.join(path.resolve(customRoot), "outputs"));
      expect(privateKeyPath).toBe(path.join(config.keysDir, "app.private.pem"));
      expect(publicJwkPath).toBe(path.join(config.outputsDir, "app.public.jwk.json"));
      expect(relativeToRoot(privateKeyPath)).toBe(path.join("keys", "app.private.pem"));
    } finally {
      configureStorageRoot(previous.rootDir);
    }
  });
});
