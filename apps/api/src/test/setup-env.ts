import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

config({
  path: resolve(currentDir, "../../.env.test"),
  override: true,
});
