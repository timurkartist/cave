import https from "https";
import fs from "fs";
import http from "http";
import { createServer } from "vite";

// Create self-signed cert (for development only)
const certDir = ".certs";
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir);
  const { execSync } = await import("child_process");
  try {
    execSync(
      `openssl req -x509 -newkey rsa:4096 -nodes -out ${certDir}/cert.pem -keyout ${certDir}/key.pem -days 365 -subj "/CN=localhost"`,
      { stdio: "inherit" }
    );
    console.log("✅ Self-signed certificate created");
  } catch (e) {
    console.warn("⚠️  Could not create cert with openssl, using insecure HTTP for now");
  }
}

// Start Vite dev server
const vite = await createServer({
  server: { middlewareMode: true },
});

const app = (req, res) => {
  return vite.middlewares(req, res);
};

// Try HTTPS
let port = 3443;
try {
  const key = fs.readFileSync(`${certDir}/key.pem`);
  const cert = fs.readFileSync(`${certDir}/cert.pem`);
  https
    .createServer({ key, cert }, app)
    .listen(port, () => {
      console.log(`🔒 HTTPS server running on https://localhost:${port}`);
    });
} catch (e) {
  // Fallback to HTTP
  port = 3000;
  http.createServer(app).listen(port, () => {
    console.log(`⚠️  HTTP server running on http://localhost:${port}`);
  });
}
