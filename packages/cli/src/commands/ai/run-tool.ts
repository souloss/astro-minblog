import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const toolsDir = join(__dirname, "..", "..", "tools");

export async function runTool(script: string, args: string[], cwd: string): Promise<void> {
  const scriptPath = join(toolsDir, script);

  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", scriptPath, ...args], {
      stdio: "inherit",
      shell: true,
      cwd,
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Process exited with code ${code}`));
    });

    child.on("error", reject);
  });
}

export async function runToolDirect(args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", ...args], {
      stdio: "inherit",
      shell: true,
      cwd,
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error("Process exited with code " + code));
    });

    child.on("error", reject);
  });
}

export { toolsDir };
