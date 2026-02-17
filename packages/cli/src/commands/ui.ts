import { Command } from "commander";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import { handleError } from "../utils/error-handler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        // Find the web package directory (relative to CLI dist/commands/)
        const webDir = path.resolve(__dirname, "../../../web");

        console.log(chalk.cyan(`\nreqord Web UI を起動しています...\n`));
        console.log(`  URL:  ${chalk.bold(`http://localhost:${port}`)}`);
        console.log(`  Root: ${cwd}`);
        console.log(chalk.gray(`\n  Ctrl+C で停止\n`));

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
            handleError(new Error("npx が見つかりません。Node.jsがインストールされていることを確認してください。"));
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
