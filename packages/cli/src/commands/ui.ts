import { Command } from "commander";
import { spawn } from "child_process";
import path from "path";
import { createRequire } from "node:module";
import chalk from "chalk";
import { handleError } from "../utils/error-handler.js";

export const uiCommand = new Command("ui")
  .description("Start the Web UI server")
  .option("-p, --port <number>", "Port number", "3000")
  .option("--open", "Open browser automatically")
  .action(
    async (options: { port: string; open?: boolean }) => {
      const cwd = process.cwd();
      const port = parseInt(options.port, 10);

      if (isNaN(port) || port < 1 || port > 65535) {
        handleError(new Error(`Invalid port number: ${options.port}`));
        return;
      }

      try {
        // Resolve @reqord/web package directory via require.resolve
        const require = createRequire(import.meta.url);
        let webDir: string;
        try {
          const webPkgPath = require.resolve("@reqord/web/package.json");
          webDir = path.dirname(webPkgPath);
        } catch {
          console.error(
            chalk.red("\n  @reqord/web is not installed.\n")
          );
          console.log(
            `  Install it with: ${chalk.cyan("npm install @reqord/web")} (or pnpm add / yarn add)\n`
          );
          process.exitCode = 1;
          return;
        }

        console.log(chalk.cyan(`\nStarting reqord Web UI...\n`));
        console.log(`  URL:  ${chalk.bold(`http://localhost:${port}`)}`);
        console.log(`  Root: ${cwd}`);
        console.log(chalk.gray(`\n  Press Ctrl+C to stop\n`));

        const child = spawn("npx", ["next", "dev", "--port", String(port)], {
          cwd: webDir,
          env: {
            ...process.env,
            REQORD_ROOT: cwd,
            PORT: String(port),
          },
          // Pipe stdout to detect server ready; inherit stderr for error visibility
          stdio: ["inherit", "pipe", "inherit"],
        });

        // Pipe stdout and detect server ready for --open
        let browserOpened = false;
        if (child.stdout) {
          child.stdout.on("data", (data: Buffer) => {
            const text = data.toString();
            process.stdout.write(text);

            if (options.open && !browserOpened && /ready/i.test(text)) {
              browserOpened = true;
              const url = `http://localhost:${port}`;
              const openCmd =
                process.platform === "darwin"
                  ? "open"
                  : process.platform === "win32"
                    ? "start"
                    : "xdg-open";
              const shell = process.platform === "win32";
              spawn(openCmd, [url], { stdio: "ignore", detached: true, shell }).unref();
            }
          });
        }

        // Handle child process errors
        child.on("error", (err) => {
          if ((err as NodeJS.ErrnoException).code === "ENOENT") {
            handleError(new Error("npx not found. Please ensure Node.js is installed."));
          } else {
            handleError(err);
          }
        });

        // SIGINT forwarding with timeout escalation
        let sigintTimeout: NodeJS.Timeout | undefined;
        let sigintSent = false;

        const sigintHandler = () => {
          if (!sigintSent) {
            sigintSent = true;
            child.kill("SIGINT");
            sigintTimeout = setTimeout(() => {
              if (!child.killed) {
                child.kill("SIGKILL");
              }
            }, 5000);
          } else {
            if (!child.killed) {
              child.kill("SIGKILL");
            }
          }
        };

        child.on("exit", (code) => {
          if (sigintTimeout) clearTimeout(sigintTimeout);
          process.removeListener("SIGINT", sigintHandler);
          if (code !== null && code !== 0) {
            process.exitCode = code;
          }
        });

        process.on("SIGINT", sigintHandler);
      } catch (error) {
        handleError(error);
      }
    },
  );
