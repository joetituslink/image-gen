import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { generateImage } from "./generateImage.js";
import { getTemplateList, getTemplatePreviewSeed } from "./templates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// ENVIRONMENT CHECK & LOADING
// ============================================
function loadEnv() {
  const envPath = path.join(__dirname, ".env");
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
  const envPath = path.join(__dirname, ".env");
  console.error(`\n❌ FATAL ERROR: .env file not found at ${envPath}`);
  console.error(
    "In production, the application requires a .env file for configuration."
  );
  process.exit(1);
}

const app = express();

const config = {
  appName: process.env.APP_NAME || "Image Gen App",
  // Use process.env.PORT directly (don't parseInt as it might be a socket path)
  port: process.env.PORT || 3001,
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
const templatePreviewDir = path.join(generatedDir, "template-previews");
const tmpDir = path.join(__dirname, "tmp");
const previewSourceFiles = [
  path.join(__dirname, "templates.js"),
  path.join(__dirname, "generateImage.js"),
];

try {
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
    console.log("✅ Created generated images directory");
  }
  if (!fs.existsSync(templatePreviewDir)) {
    fs.mkdirSync(templatePreviewDir, { recursive: true });
    console.log("✅ Created template preview directory");
  }
  // Ensure tmp directory exists for Passenger restart
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
    console.log("✅ Created tmp directory");
  }
} catch (err) {
  console.error("❌ ERROR creating directories:", err.message);
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

// Request Logger for debugging production issues
app.use((req, res, next) => {
  if (req.url.startsWith("/api/")) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

app.use("/images", express.static(generatedDir));

// ============================================
// API ROUTES (Before Frontend Static)
// ============================================
async function ensureTemplatePreviews() {
  const templates = getTemplateList();
  const sourceModifiedAt = Math.max(
    ...previewSourceFiles
      .filter((filePath) => fs.existsSync(filePath))
      .map((filePath) => fs.statSync(filePath).mtimeMs)
  );

  for (const template of templates) {
    const previewFilename = `${template.id}.webp`;
    const previewPath = path.join(templatePreviewDir, previewFilename);
    const shouldGenerate =
      !fs.existsSync(previewPath) ||
      fs.statSync(previewPath).mtimeMs < sourceModifiedAt;

    if (!shouldGenerate) continue;

    const previewSeed = getTemplatePreviewSeed(template.id);
    await generateImage({
      templateId: template.id,
      ...previewSeed,
      outputFilename: previewFilename,
      outputDir: templatePreviewDir,
    });
  }
}

function getTemplatePreviewUrl(req, templateId) {
  const previewPath = path.join(templatePreviewDir, `${templateId}.webp`);
  if (!fs.existsSync(previewPath)) return undefined;

  const previewVersion = fs.statSync(previewPath).mtimeMs;
  const baseUrl = config.baseUrl || `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/images/template-previews/${templateId}.webp?v=${previewVersion}`;
}

app.get("/api/templates", async (req, res) => {
  try {
    await ensureTemplatePreviews();
    const templates = getTemplateList().map((template) => ({
      ...template,
      previewImageUrl: getTemplatePreviewUrl(req, template.id),
    }));
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
      avatarImageBase64,
      avatarIcon,
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
      avatarImageBase64,
      avatarIcon,
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
// In production, Vite builds index.html to root, but JS/CSS to /dist
const possibleDistPaths = [
  path.join(__dirname, "."), // Production: index.html in root
  path.join(__dirname, "dist"), // Local/Fallback
];

let distPath = possibleDistPaths.find((p) =>
  fs.existsSync(path.join(p, "index.html"))
);

if (distPath) {
  const isRoot = distPath === path.join(__dirname, ".");
  console.log(`Serving frontend from: ${isRoot ? "root" : "dist folder"}`);

  if (isRoot) {
    // 1. Serve compiled assets from the dist folder
    app.use(
      "/dist",
      express.static(path.join(__dirname, "dist"), {
        immutable: true,
        maxAge: "1y",
      })
    );

    // 2. Serve public assets from the assets folder
    app.use("/assets", express.static(path.join(__dirname, "assets")));

    // 3. Serve specific root files
    const rootFiles = ["favicon.ico", "robots.txt", "placeholder.svg"];
    rootFiles.forEach((file) => {
      app.get(`/${file}`, (req, res) => {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) res.sendFile(filePath);
        else res.status(404).end();
      });
    });
  } else {
    app.use(express.static(distPath));
  }

  app.get("*", (req, res, next) => {
    if (req.url.startsWith("/api/")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  console.warn("⚠️  Frontend build not found. Run 'npm run build' first.");
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
      if (stats.isDirectory()) continue;
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
