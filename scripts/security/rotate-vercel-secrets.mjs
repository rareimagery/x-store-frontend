import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TARGET_KEYS = [
  "NEXTAUTH_SECRET",
  "DRUPAL_TOKEN",
  "DRUPAL_API_PASS",
  "STRIPE_WEBHOOK_SECRET",
];

function parseSecrets(filePath) {
  const out = new Map();
  const raw = readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1);
    out.set(key, value);
  }
  return out;
}

function runCmd(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
      ...options,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve({ stdout, stderr });
      reject(new Error(`${command} ${args.join(" ")} failed (${code}): ${stderr || stdout}`));
    });

    if (options.input) {
      child.stdin.write(options.input);
    }
    child.stdin.end();
  });
}

async function rotate() {
  const secrets = parseSecrets("../.secrets/site-credentials.txt");

  for (const key of TARGET_KEYS) {
    const value = secrets.get(key);
    if (!value) continue;

    await runCmd("npx.cmd", ["vercel", "env", "rm", key, "production", "-y"]).catch(() => {});

    const tmp = join(tmpdir(), `vercel-${key}-${Date.now()}.txt`);
    writeFileSync(tmp, value, "utf8");

    try {
      await runCmd("cmd.exe", [
        "/c",
        `type "${tmp}" | npx.cmd vercel env add ${key} production`,
      ]);
    } finally {
      unlinkSync(tmp);
    }

    process.stdout.write(`rotated_${key}\n`);
  }

  process.stdout.write("vercel_rotation_complete\n");
}

rotate().catch((err) => {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
});
