import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { generateImage } from "./generateImage.js";
import { getTemplateList } from "./templates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ============================================
// CONFIGURATION - Easy to modify for production
// ============================================
const config = {
  // Server port (can be set via PORT environment variable)
  port: process.env.PORT || 3001,

  // Base URL for generated images (set this in production)
  // Example: "https://api.yourdomain.com" or leave empty for auto-detect
  baseUrl: process.env.BASE_URL || "",

  // CORS origins (comma-separated in env, or "*" for all)
  corsOrigins: process.env.CORS_ORIGINS || "*",

  // Auto-cleanup settings
  cleanup: {
    enabled: process.env.CLEANUP_ENABLED !== "false", // Default: true
    intervalMinutes: parseInt(process.env.CLEANUP_INTERVAL_MINUTES) || 5,
    maxAgeMinutes: parseInt(process.env.CLEANUP_MAX_AGE_MINUTES) || 30,
  },

  // Request size limit
  maxRequestSize: process.env.MAX_REQUEST_SIZE || "10mb",
};

// Calculated values
const CLEANUP_INTERVAL = config.cleanup.intervalMinutes * 60 * 1000;
const MAX_AGE = config.cleanup.maxAgeMinutes * 60 * 1000;
const generatedDir = path.join(__dirname, "generated");

// Ensure generated directory exists
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true });
}

/**
 * Clean up old generated images
 */
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

    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} old image(s)`);
    }
  } catch (error) {
    console.error("Error during cleanup:", error.message);
  }
}

// Start cleanup interval
if (config.cleanup.enabled) {
  setInterval(cleanupOldImages, CLEANUP_INTERVAL);
  cleanupOldImages(); // Run on startup
}

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration
const corsOptions = {
  origin:
    config.corsOrigins === "*"
      ? "*"
      : config.corsOrigins.split(",").map((s) => s.trim()),
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// Trust proxy for correct protocol detection behind reverse proxy
app.set("trust proxy", true);

// Body parsers
app.use(express.json({ limit: config.maxRequestSize }));
app.use(express.urlencoded({ extended: true, limit: config.maxRequestSize }));

// Serve generated images statically
app.use("/images", express.static(generatedDir));

// Serve frontend static files in production
const distPath = path.join(__dirname, "../dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // Catch-all route for SPA (React Router)
  app.get("*", (req, res, next) => {
    // If it's an API request that wasn't handled, don't serve index.html
    if (req.url.startsWith("/api/")) {
      return next();
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Build the full download URL for a generated image
 */
function buildDownloadUrl(req, filename) {
  if (config.baseUrl) {
    return `${config.baseUrl}/images/${filename}`;
  }
  const protocol = req.protocol;
  const host = req.get("host");
  return `${protocol}://${host}/images/${filename}`;
}

// ============================================
// API ROUTES
// ============================================

/**
 * GET /api/templates
 * Get list of available templates
 */
app.get("/api/templates", (req, res) => {
  try {
    const templates = getTemplateList();
    res.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch templates",
    });
  }
});

/**
 * POST /api/generate-image
 * Generate a featured image with custom text overlay
 *
 * Request body:
 * {
 *   "templateId": "classic",          // Optional: template ID (default: "classic")
 *   "categoryText": "CATEGORY",       // Optional: category/subtitle text
 *   "mainText": "Your Title",         // Required: main title text
 *   "bgImageUrl": "https://...",      // Optional: URL to background image
 *   "bgImageBase64": "data:image/...",// Optional: Base64 encoded background image
 *   "bannerColor": "#ffffff",         // Optional: overrides template default
 *   "bannerOpacity": 0.85,            // Optional: overrides template default
 *   "categoryColor": "#c67c4e",       // Optional: overrides template default
 *   "titleColor": "#1a1a1a"           // Optional: overrides template default
 * }
 */
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

    // Validate required fields
    if (!mainText || !mainText.trim()) {
      return res.status(400).json({
        success: false,
        error: "Main title text is required",
      });
    }

    // Generate the image
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

    res.json({
      success: true,
      downloadUrl: buildDownloadUrl(req, result.filename),
      filename: result.filename,
    });
  } catch (error) {
    console.error("Error generating image:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate image",
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    config: {
      cleanup: config.cleanup.enabled,
      cleanupMaxAgeMinutes: config.cleanup.maxAgeMinutes,
    },
  });
});

// ============================================
// START SERVER
// ============================================
app.listen(config.port, () => {
  console.log(`\n🖼️  Image Gen App API Server`);
  console.log(`${"=".repeat(40)}`);
  console.log(`🚀 Running on http://localhost:${config.port}`);
  console.log(`\n📋 Endpoints:`);
  console.log(`   POST /api/generate-image - Generate a featured image`);
  console.log(`   GET  /api/templates      - List available templates`);
  console.log(`   GET  /api/health         - Health check`);
  console.log(`\n⚙️  Configuration:`);
  console.log(`   Port: ${config.port}`);
  console.log(`   CORS: ${config.corsOrigins}`);
  console.log(
    `   Auto-cleanup: ${config.cleanup.enabled ? `Every ${config.cleanup.intervalMinutes}min, max age ${config.cleanup.maxAgeMinutes}min` : "Disabled"}`
  );
  if (config.baseUrl) {
    console.log(`   Base URL: ${config.baseUrl}`);
  }
  console.log(`${"=".repeat(40)}\n`);
});
