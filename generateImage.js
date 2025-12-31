import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";
import { getTemplate } from "./templates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the generated images directory exists
const generatedDir = path.join(__dirname, "generated");
if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true });
}

/**
 * Fetch image from URL
 */
async function fetchImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;

    const options = {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    };

    protocol
      .get(url, options, (response) => {
        // Handle redirects
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          return fetchImageFromUrl(new URL(response.headers.location, url).href)
            .then(resolve)
            .catch(reject);
        }

        // Handle errors
        if (response.statusCode !== 200) {
          return reject(
            new Error(
              `Failed to fetch image: ${response.statusCode} ${response.statusMessage}`
            )
          );
        }

        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
        response.on("error", (err) =>
          reject(new Error(`Stream error: ${err.message}`))
        );
      })
      .on("error", (err) => reject(new Error(`Request error: ${err.message}`)));
  });
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 };
}

/**
 * Convert angle to gradient coordinates
 */
function angleToCoords(angle, width, height) {
  const rad = (angle * Math.PI) / 180;
  const x1 = width / 2 - (Math.cos(rad) * width) / 2;
  const y1 = height / 2 - (Math.sin(rad) * height) / 2;
  const x2 = width / 2 + (Math.cos(rad) * width) / 2;
  const y2 = height / 2 + (Math.sin(rad) * height) / 2;
  return { x1, y1, x2, y2 };
}

/**
 * Draw background based on config
 */
async function drawBackground(
  ctx,
  canvas,
  bgConfig,
  bgImageUrl,
  bgImageBase64
) {
  // If user provided a background image, use it (overrides template)
  if (bgImageUrl || bgImageBase64) {
    try {
      let img;
      if (bgImageBase64) {
        img = await loadImage(bgImageBase64);
      } else {
        console.log(`fetching bg image from url: ${bgImageUrl}`);
        const imageBuffer = await fetchImageFromUrl(bgImageUrl);
        img = await loadImage(imageBuffer);
      }
      const scale = Math.max(
        canvas.width / img.width,
        canvas.height / img.height
      );
      const x = (canvas.width - img.width * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      return;
    } catch (error) {
      console.error(
        `Failed to load background image (${bgImageUrl ? "URL" : "Base64"}):`,
        error.message
      );
      // Re-throw so the API caller knows their custom background failed
      throw new Error(`Background image loading failed: ${error.message}`);
    }
  }

  // Use template background
  if (bgConfig.type === "solid") {
    ctx.fillStyle = bgConfig.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (bgConfig.type === "gradient") {
    const { angle = 0, stops } = bgConfig.gradient;
    const coords = angleToCoords(angle, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(
      coords.x1,
      coords.y1,
      coords.x2,
      coords.y2
    );
    stops.forEach(({ offset, color }) => gradient.addColorStop(offset, color));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (bgConfig.type === "image" && bgConfig.imagePath) {
    // Load background image from template's asset path
    try {
      const img = await loadImage(bgConfig.imagePath);
      const scale = Math.max(
        canvas.width / img.width,
        canvas.height / img.height
      );
      const x = (canvas.width - img.width * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    } catch (error) {
      console.warn("Failed to load template background image:", error.message);
      // Fallback to a simple gradient
      const gradient = ctx.createLinearGradient(
        0,
        0,
        canvas.width,
        canvas.height
      );
      gradient.addColorStop(0, "#7dd3fc");
      gradient.addColorStop(1, "#f9a8d4");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }
}

/**
 * Draw decorations (circles, rectangles, lines)
 */
function drawDecorations(ctx, decorations) {
  if (!decorations) return;

  decorations.forEach((dec) => {
    ctx.fillStyle = dec.color || "rgba(255,255,255,0.1)";
    ctx.strokeStyle = dec.color || "rgba(255,255,255,0.1)";

    switch (dec.type) {
      case "circle":
        ctx.beginPath();
        ctx.arc(dec.x, dec.y, dec.radius, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "rect":
        if (dec.borderRadius) {
          roundRect(ctx, dec.x, dec.y, dec.width, dec.height, dec.borderRadius);
          ctx.fill();
        } else {
          ctx.fillRect(dec.x, dec.y, dec.width, dec.height);
        }
        break;
      case "line":
        ctx.lineWidth = dec.strokeWidth || 1;
        ctx.beginPath();
        ctx.moveTo(dec.x1, dec.y1);
        ctx.lineTo(dec.x2, dec.y2);
        ctx.stroke();
        break;
    }
  });
}

/**
 * Draw rounded rectangle
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draw banner based on config
 */
function drawBanner(ctx, canvas, bannerConfig, bannerColor, bannerOpacity) {
  if (!bannerConfig) return null;

  const color = bannerColor || bannerConfig.defaultColor || "#ffffff";
  const opacity = bannerOpacity ?? bannerConfig.defaultOpacity ?? 0.85;
  const rgb = hexToRgb(color);

  let bannerBounds;

  if (bannerConfig.type === "centered") {
    const height = bannerConfig.height;
    const y = (canvas.height - height) / 2;
    const padding = bannerConfig.padding;

    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    ctx.fillRect(padding, y, canvas.width - padding * 2, height);

    bannerBounds = {
      x: padding,
      y,
      width: canvas.width - padding * 2,
      height,
      centerX: canvas.width / 2,
    };
  } else if (bannerConfig.type === "left" || bannerConfig.type === "floating") {
    const { x, y, width, height, borderRadius, border, shadow } = bannerConfig;

    // Draw shadow if defined
    if (shadow) {
      ctx.save();
      ctx.shadowColor = shadow.color;
      ctx.shadowBlur = shadow.blur;
      ctx.shadowOffsetY = shadow.offsetY || 0;
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
      if (borderRadius) {
        roundRect(ctx, x, y, width, height, borderRadius);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, width, height);
      }
      ctx.restore();
    } else {
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
      if (borderRadius) {
        roundRect(ctx, x, y, width, height, borderRadius);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, width, height);
      }
    }

    // Draw border if defined
    if (border) {
      ctx.strokeStyle = border.color;
      ctx.lineWidth = border.width;
      if (borderRadius) {
        roundRect(ctx, x, y, width, height, borderRadius);
        ctx.stroke();
      } else {
        ctx.strokeRect(x, y, width, height);
      }
    }

    bannerBounds = { x, y, width, height, centerX: x + width / 2 };
  }

  return bannerBounds;
}

/**
 * Word wrap text
 */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Draw category text
 */
function drawCategory(
  ctx,
  canvas,
  categoryConfig,
  categoryText,
  categoryColor,
  bannerBounds
) {
  if (!categoryConfig || !categoryText) return;

  const color = categoryColor || categoryConfig.defaultColor;
  ctx.fillStyle = color;
  ctx.font = categoryConfig.font;

  const text =
    categoryConfig.textTransform === "uppercase"
      ? categoryText.toUpperCase()
      : categoryText;
  const align = categoryConfig.align || "center";

  let x, y;

  if (categoryConfig.x !== undefined) {
    x = categoryConfig.x;
  } else if (align === "center") {
    x = canvas.width / 2;
  } else if (bannerBounds) {
    x = bannerBounds.x + 40;
  }

  if (categoryConfig.y !== undefined) {
    y = categoryConfig.y;
  } else if (bannerBounds && categoryConfig.offsetY) {
    y = bannerBounds.y + categoryConfig.offsetY;
  }

  ctx.textAlign = align;
  ctx.textBaseline = "middle";

  // Draw badge background if enabled
  if (categoryConfig.badge?.enabled) {
    const metrics = ctx.measureText(text);
    const badgePadding = categoryConfig.badge.padding;
    const badgeWidth = metrics.width + badgePadding.x * 2;
    const badgeHeight = 30 + badgePadding.y;
    const badgeX = align === "center" ? x - badgeWidth / 2 : x - badgePadding.x;
    const badgeY = y - badgeHeight / 2;

    ctx.fillStyle = categoryConfig.badge.color;
    roundRect(
      ctx,
      badgeX,
      badgeY,
      badgeWidth,
      badgeHeight,
      categoryConfig.badge.borderRadius || 0
    );
    ctx.fill();
    ctx.fillStyle = color;
  }

  ctx.fillText(text, x, y);

  return y;
}

/**
 * Extract font size from font string
 */
function getFontSize(fontString) {
  const match = fontString.match(/(\d+)px/);
  return match ? parseInt(match[1]) : 72;
}

/**
 * Create font string with new size
 */
function setFontSize(fontString, newSize) {
  return fontString.replace(/(\d+)px/, `${newSize}px`);
}

/**
 * Draw title text with dynamic font size adjustment
 */
function drawTitle(
  ctx,
  canvas,
  titleConfig,
  titleText,
  titleColor,
  bannerBounds,
  categoryY
) {
  if (!titleConfig || !titleText) return;

  const color = titleColor || titleConfig.defaultColor;
  ctx.fillStyle = color;

  // Handle italic style
  let font = titleConfig.font;
  if (titleConfig.style === "italic") {
    font = font.replace(/^(\d+)/, "italic $1");
  }

  const align = titleConfig.align || "center";
  ctx.textAlign = align;
  ctx.textBaseline = "middle";

  let maxWidth;
  if (titleConfig.maxWidth !== undefined) {
    if (titleConfig.maxWidth < 0 && bannerBounds) {
      maxWidth = bannerBounds.width + titleConfig.maxWidth;
    } else {
      maxWidth = titleConfig.maxWidth;
    }
  } else {
    maxWidth = canvas.width - 200;
  }

  // Dynamic font size adjustment
  const originalFontSize = getFontSize(font);
  const minFontSize = Math.max(originalFontSize * 0.5, 30); // Don't go below 50% of original or 30px
  const maxLines = 4; // Maximum number of lines before reducing font size
  const maxHeight = bannerBounds
    ? bannerBounds.height * 0.8
    : canvas.height * 0.5;

  let currentFontSize = originalFontSize;
  let currentFont = font;
  let lines = [];
  let lineHeight = titleConfig.lineHeight || 80;

  // Try to fit text by reducing font size if needed
  while (currentFontSize >= minFontSize) {
    ctx.font = currentFont;
    lines = wrapText(ctx, titleText, maxWidth);

    // Calculate total height needed
    const totalHeight = lines.length * lineHeight;

    // Check if it fits well (not too many lines and fits in available space)
    if (lines.length <= maxLines && totalHeight <= maxHeight) {
      break; // Text fits!
    }

    // Reduce font size and line height proportionally
    currentFontSize -= 4;
    if (currentFontSize < minFontSize) {
      currentFontSize = minFontSize;
    }

    currentFont = setFontSize(font, currentFontSize);
    lineHeight =
      (titleConfig.lineHeight || 80) * (currentFontSize / originalFontSize);

    // One more check at minimum font size
    if (currentFontSize === minFontSize) {
      ctx.font = currentFont;
      lines = wrapText(ctx, titleText, maxWidth);
      break;
    }
  }

  // Apply final font
  ctx.font = currentFont;
  ctx.fillStyle = color;

  let x, startY;

  if (titleConfig.x !== undefined) {
    x = titleConfig.x;
  } else if (align === "center") {
    x = canvas.width / 2;
  } else if (bannerBounds) {
    x = bannerBounds.x + 40;
  }

  if (titleConfig.y !== undefined) {
    startY = titleConfig.y;
  } else if (categoryY && titleConfig.offsetY) {
    startY = categoryY + titleConfig.offsetY;
  } else if (bannerBounds) {
    startY = bannerBounds.y + bannerBounds.height / 2;
  }

  lines.forEach((line, index) => {
    ctx.fillText(line, x, startY + index * lineHeight);
  });
}

/**
 * Draw subtitle if enabled
 */
function drawSubtitle(ctx, subtitleConfig) {
  if (!subtitleConfig?.enabled) return;

  ctx.fillStyle = subtitleConfig.color;
  ctx.font = subtitleConfig.font;
  ctx.textAlign = subtitleConfig.align || "left";
  ctx.textBaseline = "middle";
  ctx.fillText(subtitleConfig.text, subtitleConfig.x, subtitleConfig.y);
}

/**
 * Generate a featured image with text overlay
 */
export async function generateImage({
  templateId = "classic",
  categoryText,
  mainText,
  bgImageUrl,
  bgImageBase64,
  bannerColor,
  bannerOpacity,
  categoryColor,
  titleColor,
}) {
  const template = getTemplate(templateId);
  const config = template.config;

  // Create canvas
  const canvas = createCanvas(config.canvas.width, config.canvas.height);
  const ctx = canvas.getContext("2d");

  // Draw background
  await drawBackground(
    ctx,
    canvas,
    config.background,
    bgImageUrl,
    bgImageBase64
  );

  // Draw decorations (before banner)
  drawDecorations(ctx, config.decorations);

  // Draw banner
  const bannerBounds = drawBanner(
    ctx,
    canvas,
    config.banner,
    bannerColor,
    bannerOpacity
  );

  // Draw category text
  const categoryY = drawCategory(
    ctx,
    canvas,
    config.category,
    categoryText,
    categoryColor,
    bannerBounds
  );

  // Draw title
  drawTitle(
    ctx,
    canvas,
    config.title,
    mainText,
    titleColor,
    bannerBounds,
    categoryY
  );

  // Draw subtitle if configured
  drawSubtitle(ctx, config.subtitle);

  // Generate unique filename
  const filename = `featured-image-${Date.now()}.webp`;
  const filepath = path.join(generatedDir, filename);

  // Save to file in WebP format with optimization
  const buffer = canvas.toBuffer("image/webp", 80); // 80 is a good balance of quality and size
  fs.writeFileSync(filepath, buffer);

  return {
    filename,
    filepath,
    buffer,
  };
}
