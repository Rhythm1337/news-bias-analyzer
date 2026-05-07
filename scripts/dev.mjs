// Dev orchestrator. Replaces `concurrently` because on Windows a uvicorn
// reload can deliver CTRL_BREAK across the shared console and kill siblings.
//
// Strategy:
//   - python.exe is spawned with shell:false (real binary; correctly handles
//     paths containing spaces).
//   - npm.cmd is spawned with shell:true on Windows (Node ≥20 refuses to
//     execute .cmd / .bat without a shell).
//   - If a child dies unexpectedly we restart it. Only Ctrl+C of this script
//     tears the whole tree down.

import { spawn } from "node:child_process";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");
const isWindows = process.platform === "win32";

const pythonExe = isWindows
  ? join(repoRoot, "backend", ".venv", "Scripts", "python.exe")
  : join(repoRoot, "backend", ".venv", "bin", "python");

if (!existsSync(pythonExe)) {
  console.error(
    `[dev] Python venv not found at ${pythonExe}\nRun \`npm run setup\` first.`,
  );
  process.exit(1);
}

const procs = [
  {
    name: "backend",
    color: "\x1b[32m",
    cmd: pythonExe,
    args: [
      "-m",
      "uvicorn",
      "app.main:app",
      "--reload",
      "--reload-dir",
      "app",
      "--port",
      "8000",
      "--host",
      "127.0.0.1",
    ],
    // Run from backend/ so pydantic-settings finds .env (env_file=".env")
    cwd: join(repoRoot, "backend"),
    shell: false,
  },
  {
    name: "frontend",
    color: "\x1b[35m",
    cmd: isWindows ? "npm.cmd" : "npm",
    args: ["--workspace", "frontend", "run", "dev"],
    cwd: repoRoot,
    shell: isWindows,
  },
];

const RESET = "\x1b[0m";
const RESTART_DELAY_MS = 800;
const RESTART_BURST_LIMIT = 5;
const RESTART_BURST_WINDOW_MS = 10_000;

let shuttingDown = false;
const handles = new Map();

function pipe(stream, name, color) {
  let buf = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    buf += chunk;
    let i;
    while ((i = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, i).replace(/\r$/, "");
      buf = buf.slice(i + 1);
      process.stdout.write(`${color}[${name}]${RESET} ${line}\n`);
    }
  });
  stream.on("end", () => {
    if (buf.length) process.stdout.write(`${color}[${name}]${RESET} ${buf}\n`);
  });
}

function start(p) {
  const child = spawn(p.cmd, p.args, {
    cwd: p.cwd,
    stdio: ["ignore", "pipe", "pipe"],
    shell: p.shell,
    windowsHide: true,
  });
  pipe(child.stdout, p.name, p.color);
  pipe(child.stderr, p.name, p.color);

  child.on("error", (err) => {
    process.stdout.write(
      `${p.color}[${p.name}]${RESET} spawn error: ${err.message}\n`,
    );
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    const handle = handles.get(p.name);
    const now = Date.now();
    handle.recentExits = handle.recentExits.filter(
      (t) => now - t < RESTART_BURST_WINDOW_MS,
    );
    handle.recentExits.push(now);

    if (handle.recentExits.length > RESTART_BURST_LIMIT) {
      process.stdout.write(
        `${p.color}[${p.name}]${RESET} crashed too many times in a short window — giving up. Run npm run dev again.\n`,
      );
      shutdown();
      return;
    }

    process.stdout.write(
      `${p.color}[${p.name}]${RESET} exited (code=${code}, signal=${signal}); restarting in ${RESTART_DELAY_MS}ms...\n`,
    );
    setTimeout(() => {
      if (shuttingDown) return;
      handle.child = start(p);
    }, RESTART_DELAY_MS);
  });

  return child;
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  process.stdout.write("\n[dev] shutting down children...\n");
  for (const { child } of handles.values()) {
    if (!child || child.killed || child.exitCode !== null) continue;
    try {
      if (isWindows) {
        spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
          stdio: "ignore",
          shell: true,
        });
      } else {
        child.kill("SIGTERM");
      }
    } catch (e) {
      process.stdout.write(`[dev] kill failed for ${child.pid}: ${e}\n`);
    }
  }
  setTimeout(() => process.exit(0), 1500);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
if (isWindows) process.on("SIGBREAK", shutdown);

for (const p of procs) {
  handles.set(p.name, { child: null, recentExits: [] });
  handles.get(p.name).child = start(p);
}
