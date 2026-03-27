import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { generateImage } from "./generateImage.js";
import { curatedLucideIconNameSet } from "./shared/iconCatalog.js";
import { mainTextFontFamilies } from "./shared/fontCatalog.js";
import { getTemplate, getTemplateList, getTemplatePreviewSeed } from "./templates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return false;

  try {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (!match) return;

      const key = match[1];
      let value = (match[2] || "").trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    });
    console.log("✅ Environment variables loaded from .env");
    return true;
  } catch (error) {
    console.error("❌ Error reading .env file:", error.message);
    return false;
  }
}

const envLoaded = loadEnv();
if (process.env.NODE_ENV === "production" && !envLoaded) {
  const envPath = path.join(__dirname, ".env");
  console.error(`\n❌ FATAL ERROR: .env file not found at ${envPath}`);
  process.exit(1);
}

const app = express();
const config = {
  appName: process.env.APP_NAME || "Image Gen App",
  port: process.env.PORT || 3001,
  baseUrl: process.env.BASE_URL || "",
  corsOrigins: process.env.CORS_ORIGINS || "*",
  cleanup: {
    enabled: process.env.CLEANUP_ENABLED !== "false",
    intervalMinutes: parseInt(process.env.CLEANUP_INTERVAL_MINUTES, 10) || 5,
    maxAgeMinutes: parseInt(process.env.CLEANUP_MAX_AGE_MINUTES, 10) || 30,
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
  path.join(__dirname, "shared", "iconCatalog.js"),
  path.join(__dirname, "shared", "fontCatalog.js"),
];

for (const directory of [generatedDir, templatePreviewDir, tmpDir]) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function parseLinearGradientCss(input) {
  const match = input.match(
    /^linear-gradient\(\s*(-?\d+(?:\.\d+)?)deg\s*,\s*([^,]+?)\s+0%\s*,\s*([^,]+?)\s+100%\s*\)$/i
  );
  if (!match) return null;

  return {
    angle: parseFloat(match[1]),
    startColor: match[2].trim(),
    endColor: match[3].trim(),
  };
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function parsePositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeGeneratePayload(body) {
  const template = getTemplate(body.templateId);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const mainText = typeof body.mainText === "string" ? body.mainText.trim() : "";
  const backgroundType = body.backgroundType;
  const surfaceColor = isNonEmptyString(body.surfaceColor)
    ? body.surfaceColor.trim()
    : template.defaults.surfaceColor;
  const surfaceOpacity =
    body.surfaceOpacity !== undefined && body.surfaceOpacity !== null
      ? parseFloat(body.surfaceOpacity)
      : template.defaults.surfaceOpacity;
  const primaryColor = isNonEmptyString(body.primaryColor)
    ? body.primaryColor.trim()
    : template.defaults.primaryColor;
  const mainTextColor = isNonEmptyString(body.mainTextColor)
    ? body.mainTextColor.trim()
    : template.defaults.mainTextColor;
  const mainTextFontFamily = isNonEmptyString(body.mainTextFontFamily)
    ? body.mainTextFontFamily.trim()
    : template.defaults.mainTextFontFamily;
  const mainTextFontSize =
    body.mainTextFontSize !== undefined && body.mainTextFontSize !== null
      ? parsePositiveNumber(body.mainTextFontSize)
      : template.defaults.mainTextFontSize;
  const backgroundImageZoom =
    body.backgroundImageZoom !== undefined && body.backgroundImageZoom !== null
      ? parsePositiveNumber(body.backgroundImageZoom)
      : 1;
  const backgroundImageOffsetX =
    body.backgroundImageOffsetX !== undefined && body.backgroundImageOffsetX !== null
      ? parsePositiveNumber(body.backgroundImageOffsetX)
      : 0;
  const backgroundImageOffsetY =
    body.backgroundImageOffsetY !== undefined && body.backgroundImageOffsetY !== null
      ? parsePositiveNumber(body.backgroundImageOffsetY)
      : 0;
  const flipBackgroundPosition =
    body.flipBackgroundPosition === true || body.flipBackgroundPosition === "true";
  const iconSource =
    body.iconSource === "lucide" || body.iconSource === "image"
      ? body.iconSource
      : "none";
  const iconName = isNonEmptyString(body.iconName) ? body.iconName.trim() : "";
  const iconImageBase64 = isNonEmptyString(body.iconImageBase64)
    ? body.iconImageBase64.trim()
    : "";
  const iconColor = isNonEmptyString(body.iconColor)
    ? body.iconColor.trim()
    : template.defaults.iconColor;
  const iconBackgroundColor = isNonEmptyString(body.iconBackgroundColor)
    ? body.iconBackgroundColor.trim()
    : primaryColor;

  if (!name) throw validationError("Name is required");
  if (name.length > 25) throw validationError("Name must be 25 characters or fewer");
  if (!mainText) throw validationError("Main text is required");
  if (mainText.length > 70) {
    throw validationError("Main text must be 70 characters or fewer");
  }
  if (!mainTextFontFamily) {
    throw validationError("Main text font family is required");
  }
  if (!mainTextFontFamilies.has(mainTextFontFamily)) {
    throw validationError("Selected main text font is not supported");
  }
  if (!Number.isFinite(mainTextFontSize) || mainTextFontSize < 24 || mainTextFontSize > 120) {
    throw validationError("Main text font size must be between 24 and 120");
  }

  if (!["color", "gradient", "image"].includes(backgroundType)) {
    throw validationError("Background type must be color, gradient, or image");
  }
  if (!Number.isFinite(backgroundImageZoom) || backgroundImageZoom < 1 || backgroundImageZoom > 3) {
    throw validationError("Background image zoom must be between 1 and 3");
  }
  if (
    !Number.isFinite(backgroundImageOffsetX) ||
    backgroundImageOffsetX < -100 ||
    backgroundImageOffsetX > 100
  ) {
    throw validationError("Background image horizontal position must be between -100 and 100");
  }
  if (
    !Number.isFinite(backgroundImageOffsetY) ||
    backgroundImageOffsetY < -100 ||
    backgroundImageOffsetY > 100
  ) {
    throw validationError("Background image vertical position must be between -100 and 100");
  }

  let background;
  if (backgroundType === "color") {
    if (!isNonEmptyString(body.backgroundColor)) {
      throw validationError("Background color is required for color backgrounds");
    }
    background = {
      type: "color",
      color: body.backgroundColor.trim(),
    };
  } else if (backgroundType === "gradient") {
    if (!isNonEmptyString(body.backgroundGradientCss)) {
      throw validationError(
        "Gradient config is required for gradient backgrounds"
      );
    }
    const parsedGradient = parseLinearGradientCss(body.backgroundGradientCss.trim());
    if (!parsedGradient) {
      throw validationError(
        "Gradient config must use linear-gradient(<angle>deg, <color> 0%, <color> 100%)"
      );
    }
    background = {
      type: "gradient",
      css: body.backgroundGradientCss.trim(),
      gradient: parsedGradient,
    };
  } else {
    if (!isNonEmptyString(body.backgroundImageBase64)) {
      throw validationError("Background image is required for image backgrounds");
    }
    background = {
      type: "image",
      imageBase64: body.backgroundImageBase64.trim(),
      zoom: backgroundImageZoom,
      offsetX: backgroundImageOffsetX,
      offsetY: backgroundImageOffsetY,
    };
  }

  if (!Number.isFinite(surfaceOpacity) || surfaceOpacity < 0 || surfaceOpacity > 1) {
    throw validationError("Surface opacity must be between 0 and 1");
  }

  if (iconSource === "lucide") {
    if (!curatedLucideIconNameSet.has(iconName)) {
      throw validationError("Selected icon is not supported");
    }
  }

  if (iconSource === "image" && !iconImageBase64) {
    throw validationError("Icon image is required when icon source is image");
  }

  return {
    templateId: template.id,
    name,
    mainText,
    background,
    iconSource,
    iconName,
    iconImageBase64,
    iconColor,
    iconBackgroundColor,
    surfaceColor,
    surfaceOpacity,
    primaryColor,
    mainTextColor,
    mainTextFontFamily,
    mainTextFontSize,
    flipBackgroundPosition,
  };
}

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
    const previewPayload = normalizeGeneratePayload({
      templateId: template.id,
      ...previewSeed,
    });
    await generateImage({
      ...previewPayload,
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

app.use(
  cors({
    origin:
      config.corsOrigins === "*"
        ? "*"
        : config.corsOrigins.split(",").map((value) => value.trim()),
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.set("trust proxy", true);
app.use(express.json({ limit: config.maxRequestSize }));
app.use(express.urlencoded({ extended: true, limit: config.maxRequestSize }));
app.use("/images", express.static(generatedDir));

app.use((req, _res, next) => {
  if (req.url.startsWith("/api/")) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

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
    const payload = normalizeGeneratePayload(req.body);
    const result = await generateImage(payload);
    const baseUrl = config.baseUrl || `${req.protocol}://${req.get("host")}`;
    res.json({
      success: true,
      downloadUrl: `${baseUrl}/images/${result.filename}`,
      filename: result.filename,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    console.error("Error generating image:", error);
    res.status(statusCode).json({
      success: false,
      error: error.message || "Failed to generate image",
    });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const possibleDistPaths = [path.join(__dirname, "."), path.join(__dirname, "dist")];
const distPath = possibleDistPaths.find((targetPath) =>
  fs.existsSync(path.join(targetPath, "index.html"))
);

if (distPath) {
  if (distPath === path.join(__dirname, ".")) {
    app.use(
      "/dist",
      express.static(path.join(__dirname, "dist"), {
        immutable: true,
        maxAge: "1y",
      })
    );
    app.use("/assets", express.static(path.join(__dirname, "assets")));
    ["favicon.ico", "robots.txt", "placeholder.svg"].forEach((file) => {
      app.get(`/${file}`, (_req, res) => {
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
}

app.listen(config.port, () => {
  console.log(`\n🖼️  ${config.appName} Running on http://localhost:${config.port}\n`);
});

function cleanupOldImages() {
  if (!config.cleanup.enabled || !fs.existsSync(generatedDir)) return;

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
      deletedCount += 1;
    }
  }

  if (deletedCount > 0) {
    console.log(`🧹 Cleaned up ${deletedCount} old image(s)`);
  }
}

if (config.cleanup.enabled) {
  setInterval(cleanupOldImages, CLEANUP_INTERVAL);
  cleanupOldImages();
}
