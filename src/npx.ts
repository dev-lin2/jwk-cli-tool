#!/usr/bin/env node
import { input } from "@inquirer/prompts";
import path from "path";
import { formatErrorMessage, runCliApp } from "./app";
import { configureStorageRoot } from "./functions/fileUtils";

async function promptForBaseFolder(): Promise<string> {
  const defaultBaseFolder = path.join(process.cwd(), "jwk");

  const raw = await input({
    message: "Base folder for generated files (keys/outputs will be created inside):",
    default: defaultBaseFolder,
    validate: (value) => (value.trim() ? true : "Base folder is required.")
  });

  return path.resolve(raw.trim() || defaultBaseFolder);
}

async function main(): Promise<void> {
  const baseFolder = await promptForBaseFolder();
  const config = configureStorageRoot(baseFolder);

  console.log(`\nSaving keys to   : ${config.keysDir}`);
  console.log(`Saving JWK files : ${config.outputsDir}\n`);

  await runCliApp();
}

void main().catch((error) => {
  console.error(`Fatal error: ${formatErrorMessage(error)}`);
  process.exit(1);
});
