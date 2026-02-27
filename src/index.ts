import { formatErrorMessage, runCliApp } from "./app";
import { configureStorageRoot } from "./functions/fileUtils";

configureStorageRoot(process.cwd());

void runCliApp().catch((error) => {
  console.error(`Fatal error: ${formatErrorMessage(error)}`);
  process.exit(1);
});

