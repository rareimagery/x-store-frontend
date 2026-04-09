#!/usr/bin/env node
// GitHub webhook receiver — auto-deploys on push to main
// Runs on port 9000, triggered by GitHub webhook
// PM2: pm2 start deploy/webhook-server.js --name deploy-hook

const http = require("http");
const crypto = require("crypto");
const { execSync } = require("child_process");

const PORT = 9000;
const SECRET = process.env.DEPLOY_WEBHOOK_SECRET || "";
const DEPLOY_SCRIPT = "/var/www/rareimagery/deploy/deploy.sh";

let deploying = false;

function verify(body, signature) {
  if (!SECRET) return true; // No secret = skip verification
  const hmac = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(`sha256=${hmac}`),
    Buffer.from(signature || "")
  );
}

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/deploy") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const sig = req.headers["x-hub-signature-256"] || "";
    if (SECRET && !verify(body, sig)) {
      console.log("[webhook] Invalid signature — rejected");
      res.writeHead(403);
      res.end("Invalid signature");
      return;
    }

    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      res.writeHead(400);
      res.end("Invalid JSON");
      return;
    }

    // Only deploy on push to main
    if (payload.ref !== "refs/heads/main") {
      res.writeHead(200);
      res.end("Skipped — not main branch");
      return;
    }

    if (deploying) {
      res.writeHead(200);
      res.end("Deploy already in progress");
      return;
    }

    console.log(`[webhook] Push to main by ${payload.pusher?.name || "unknown"} — deploying...`);
    deploying = true;
    res.writeHead(200);
    res.end("Deploying...");

    try {
      execSync(`bash ${DEPLOY_SCRIPT}`, {
        stdio: "inherit",
        timeout: 300000, // 5 min max
      });
      console.log("[webhook] Deploy complete");
    } catch (err) {
      console.error("[webhook] Deploy failed:", err.message);
    } finally {
      deploying = false;
    }
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[webhook] Listening on 127.0.0.1:${PORT}/deploy`);
});
