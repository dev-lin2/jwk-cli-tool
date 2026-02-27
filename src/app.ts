import { select } from "@inquirer/prompts";
import { ensureProjectDirs } from "./functions/fileUtils";
import { runGenerateKeyFlow } from "./prompts/generateKey";
import { runGenerateJwkFlow } from "./prompts/generateJwk";

type MainAction = "generate-key" | "generate-jwk" | "exit";

export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

async function promptMainMenu(): Promise<MainAction> {
  const action = await select({
    message: "What would you like to do?",
    choices: [
      { name: "1. Generate new PEM key pair", value: "generate-key" },
      { name: "2. Generate JWK JSON files", value: "generate-jwk" },
      { name: "3. Exit", value: "exit" }
    ]
  });

  return action as MainAction;
}

export async function runCliApp(): Promise<void> {
  await ensureProjectDirs();

  while (true) {
    try {
      const action = await promptMainMenu();

      if (action === "exit") {
        console.log("Goodbye.");
        return;
      }

      if (action === "generate-key") {
        await runGenerateKeyFlow();
        continue;
      }

      await runGenerateJwkFlow();
    } catch (error) {
      console.error(`\nOperation failed: ${formatErrorMessage(error)}\n`);
    }
  }
}

