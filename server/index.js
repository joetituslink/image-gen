import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { generateImage } from "./generateImage.js";
import { getTemplateList } from "./templates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// ENVIRONMENT CHECK & LOADING
// ============================================
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, "utf-8");
      envContent.split("\n").forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = (match[2] || "").trim();
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.substring(1, value.length - 1);
          }
          process.env[key] = value;
        }
      });
      console.log("✅ Environment variables loaded from .env");
      return true;
    } catch (err) {
      console.error("❌ Error reading .env file:", err.message);
    }
  }
  return false;
}

const envLoaded = loadEnv();

if (process.env.NODE_ENV === "production" && !envLoaded) {
  const envPath = path.join(__dirname, "..", ".env");
  console.error(`\n❌ FATAL ERROR: .env file not found at ${envPath}`);
  console.error(
    "In production, the application requires a .env file for configuration."
  );
  process.exit(1);
}

const app = express();

const config = {
  appName: process.env.APP_NAME || "Image Gen App",
  // Ensure port is a valid number
  port: parseInt(process.env.PORT) || 3001,
  baseUrl: process.env.BASE_URL || "",
  corsOrigins: process.env.CORS_ORIGINS || "*",
  cleanup: {
    enabled: process.env.CLEANUP_ENABLED !== "false",
    intervalMinutes: parseInt(process.env.CLEANUP_INTERVAL_MINUTES) || 5,
    maxAgeMinutes: parseInt(process.env.CLEANUP_MAX_AGE_MINUTES) || 30,
  },
  maxRequestSize: process.env.MAX_REQUEST_SIZE || "10mb",
};

const CLEANUP_INTERVAL = config.cleanup.intervalMinutes * 60 * 1000;
const MAX_AGE = config.cleanup.maxAgeMinutes * 60 * 1000;
const generatedDir = path.join(__dirname, "generated");

try {
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
    console.log("✅ Created generated images directory");
  }
} catch (err) {
  console.error("❌ ERROR creating generated directory:", err.message);
}

// ============================================
// MIDDLEWARE
// ============================================
const corsOptions = {
  origin:
    config.corsOrigins === "*"
      ? "*"
      : config.corsOrigins.split(",").map((s) => s.trim()),
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.set("trust proxy", true);
app.use(express.json({ limit: config.maxRequestSize }));
app.use(express.urlencoded({ extended: true, limit: config.maxRequestSize }));
app.use("/images", express.static(generatedDir));

// ============================================
// API ROUTES (Before Frontend Static)
// ============================================
app.get("/api/templates", (req, res) => {
  try {
    const templates = getTemplateList();
    res.json({ success: true, templates });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({
      success: false,
      error: `Server Error: ${error.message || "Failed to fetch templates"}`,
    });
  }
});

app.post("/api/generate-image", async (req, res) => {
  try {
    const {
      templateId = "classic",
      categoryText = "CATEGORY",
      mainText,
      bgImageUrl,
      bgImageBase64,
      bannerColor,
      bannerOpacity,
      categoryColor,
      titleColor,
    } = req.body;
    if (!mainText || !mainText.trim())
      return res
        .status(400)
        .json({ success: false, error: "Main title text is required" });

    const result = await generateImage({
      templateId,
      categoryText,
      mainText,
      bgImageUrl,
      bgImageBase64,
      bannerColor,
      bannerOpacity:
        bannerOpacity !== undefined ? parseFloat(bannerOpacity) : undefined,
      categoryColor,
      titleColor,
    });

    const protocol = req.protocol;
    const host = req.get("host");
    const downloadUrl = config.baseUrl
      ? `${config.baseUrl}/images/${result.filename}`
      : `${protocol}://${host}/images/${result.filename}`;

    res.json({ success: true, downloadUrl, filename: result.filename });
  } catch (error) {
    console.error("Error generating image:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate image",
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============================================
// FRONTEND SERVING
// ============================================
const possibleDistPaths = [
  path.join(__dirname, "../dist"),
  path.join(__dirname, ".."),
  path.join(__dirname, "."),
];

let distPath = possibleDistPaths.find((p) =>
  fs.existsSync(path.join(p, "index.html"))
);

if (distPath) {
  console.log(`Serving frontend from: ${distPath}`);
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.url.startsWith("/api/")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// ============================================
// START SERVER
// ============================================
app.listen(config.port, () => {
  console.log(
    `\n🖼️  ${config.appName} Running on http://localhost:${config.port}\n`
  );
});

function cleanupOldImages() {
  if (!config.cleanup.enabled) return;
  try {
    if (!fs.existsSync(generatedDir)) return;
    const now = Date.now();
    const files = fs.readdirSync(generatedDir);
    let deletedCount = 0;
    for (const file of files) {
      if (file === ".gitkeep") continue;
      const filePath = path.join(generatedDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > MAX_AGE) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
    if (deletedCount > 0)
      console.log(`🧹 Cleaned up ${deletedCount} old image(s)`);
  } catch (error) {
    console.error("Error during cleanup:", error.message);
  }
}

if (config.cleanup.enabled) {
  setInterval(cleanupOldImages, CLEANUP_INTERVAL);
  cleanupOldImages();
}
