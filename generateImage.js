import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BadgeCheck,
  Bolt,
  BookOpen,
  Camera,
  Flame,
  Globe,
  Heart,
  Leaf,
  Megaphone,
  MessageCircle,
  MoonStar,
  Music4,
  Palette,
  PenTool,
  Sparkles,
  Star,
  Sun,
  User,
} from "lucide-react";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { serverFontRegistrations } from "./shared/fontCatalog.js";
import { getTemplate } from "./templates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const generatedDir = path.join(__dirname, "generated");

if (!fs.existsSync(generatedDir)) {
  fs.mkdirSync(generatedDir, { recursive: true });
}

const curatedIconComponents = {
  "badge-check": BadgeCheck,
  bolt: Bolt,
  "book-open": BookOpen,
  camera: Camera,
  flame: Flame,
  globe: Globe,
  heart: Heart,
  leaf: Leaf,
  megaphone: Megaphone,
  "message-circle": MessageCircle,
  "moon-star": MoonStar,
  "music-4": Music4,
  palette: Palette,
  "pen-tool": PenTool,
  sparkles: Sparkles,
  star: Star,
  sun: Sun,
  user: User,
};
const lucideSvgDataUriCache = new Map();

for (const fontRegistration of serverFontRegistrations) {
  const fontPath = path.join(__dirname, fontRegistration.path);
  if (fs.existsSync(fontPath)) {
    GlobalFonts.registerFromPath(fontPath, fontRegistration.family);
  }
}

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

function angleToCoords(angle, width, height) {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const radius = Math.hypot(width, height) / 2;
  const x1 = width / 2 - dx * radius;
  const y1 = height / 2 - dy * radius;
  const x2 = width / 2 + dx * radius;
  const y2 = height / 2 + dy * radius;
  return { x1, y1, x2, y2 };
}

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

function drawPolygonPath(ctx, points) {
  if (!points?.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  ctx.closePath();
}

function drawFallbackBackground(ctx, canvas, fallbackBackground) {
  if (!fallbackBackground || fallbackBackground.type === "color") {
    ctx.fillStyle = fallbackBackground?.color || "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const coords = angleToCoords(
    fallbackBackground.angle || 135,
    canvas.width,
    canvas.height
  );
  const gradient = ctx.createLinearGradient(
    coords.x1,
    coords.y1,
    coords.x2,
    coords.y2
  );
  gradient.addColorStop(0, fallbackBackground.startColor);
  gradient.addColorStop(1, fallbackBackground.endColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawColorBackground(ctx, canvas, backgroundColor) {
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGradientBackground(ctx, canvas, backgroundGradient) {
  const coords = angleToCoords(
    backgroundGradient.angle,
    canvas.width,
    canvas.height
  );
  const gradient = ctx.createLinearGradient(
    coords.x1,
    coords.y1,
    coords.x2,
    coords.y2
  );
  gradient.addColorStop(0, backgroundGradient.startColor);
  gradient.addColorStop(1, backgroundGradient.endColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

async function drawContainedImage(ctx, canvas, imageSource, placement) {
  const image = await loadImage(imageSource);
  const targetX = placement?.x ?? 0;
  const targetY = placement?.y ?? 0;
  const targetWidth = placement?.width ?? canvas.width;
  const targetHeight = placement?.height ?? canvas.height;
  const fit = placement?.fit || "contain";
  const zoom = placement?.zoom || 1;
  const scale =
    fit === "cover"
      ? Math.max(targetWidth / image.width, targetHeight / image.height)
      : Math.min(targetWidth / image.width, targetHeight / image.height);
  const scaled = scale * zoom;
  const drawWidth = image.width * scaled;
  const drawHeight = image.height * scaled;
  let drawX = targetX + (targetWidth - drawWidth) / 2;
  let drawY = targetY + (targetHeight - drawHeight) / 2;

  if (placement?.alignX === "left") {
    drawX = targetX;
  } else if (placement?.alignX === "right") {
    drawX = targetX + targetWidth - drawWidth;
  }

  if (placement?.alignY === "top") {
    drawY = targetY;
  } else if (placement?.alignY === "bottom") {
    drawY = targetY + targetHeight - drawHeight;
  }

  const offsetX = ((placement?.offsetX ?? 0) / 100) * targetWidth;
  const offsetY = ((placement?.offsetY ?? 0) / 100) * targetHeight;
  drawX += offsetX;
  drawY += offsetY;

  ctx.save();
  if (placement) {
    ctx.beginPath();
    ctx.rect(targetX, targetY, targetWidth, targetHeight);
    ctx.clip();
  }
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

async function drawBackground(
  ctx,
  canvas,
  backgroundInput,
  fallbackBackground,
  backgroundImagePlacement
) {
  if (backgroundInput.type === "image") {
    drawFallbackBackground(ctx, canvas, fallbackBackground);
    await drawContainedImage(
      ctx,
      canvas,
      backgroundInput.imageBase64,
      {
        ...backgroundImagePlacement,
        zoom: backgroundInput.zoom,
        offsetX: backgroundInput.offsetX,
        offsetY: backgroundInput.offsetY,
      }
    );
    return;
  }

  if (backgroundInput.type === "color") {
    drawColorBackground(ctx, canvas, backgroundInput.color);
    return;
  }

  drawGradientBackground(ctx, canvas, backgroundInput.gradient);
}

function resolveTemplateColor(color, colorRole, primaryColor) {
  if (colorRole === "primaryColor") {
    return primaryColor || color || "#2563eb";
  }

  if (colorRole === "primaryColorSoft") {
    const rgb = hexToRgb(primaryColor || "#2563eb");
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`;
  }

  return color || "rgba(255,255,255,0.1)";
}

function drawDecorations(ctx, decorations, primaryColor) {
  if (!decorations) return;

  decorations.forEach((decoration) => {
    const resolvedColor = resolveTemplateColor(
      decoration.color,
      decoration.colorRole,
      primaryColor
    );
    ctx.fillStyle = resolvedColor;
    ctx.strokeStyle = resolvedColor;

    switch (decoration.type) {
      case "circle":
        ctx.beginPath();
        ctx.arc(decoration.x, decoration.y, decoration.radius, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "rect":
        if (decoration.borderRadius) {
          roundRect(
            ctx,
            decoration.x,
            decoration.y,
            decoration.width,
            decoration.height,
            decoration.borderRadius
          );
          ctx.fill();
        } else {
          ctx.fillRect(
            decoration.x,
            decoration.y,
            decoration.width,
            decoration.height
          );
        }
        break;
      case "line":
        ctx.lineWidth = decoration.strokeWidth || 1;
        ctx.beginPath();
        ctx.moveTo(decoration.x1, decoration.y1);
        ctx.lineTo(decoration.x2, decoration.y2);
        ctx.stroke();
        break;
      case "polygon":
        drawPolygonPath(ctx, decoration.points);
        if (decoration.fill !== false) {
          ctx.fill();
        }
        if (decoration.strokeWidth) {
          ctx.lineWidth = decoration.strokeWidth;
          ctx.stroke();
        }
        break;
    }
  });
}

function drawSurface(ctx, canvas, surfaceConfig, surfaceColor, surfaceOpacity) {
  if (!surfaceConfig) return null;

  const color = surfaceColor || surfaceConfig.defaultColor || "#ffffff";
  const opacity = surfaceOpacity ?? surfaceConfig.defaultOpacity ?? 0.85;
  const rgb = hexToRgb(color);
  let bounds;

  if (surfaceConfig.type === "centered") {
    const height = surfaceConfig.height;
    const y = (canvas.height - height) / 2;
    const padding = surfaceConfig.padding;
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    ctx.fillRect(padding, y, canvas.width - padding * 2, height);
    bounds = {
      x: padding,
      y,
      width: canvas.width - padding * 2,
      height,
      centerX: canvas.width / 2,
    };
  } else {
    const { x, y, width, height, borderRadius, border, shadow } = surfaceConfig;
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
    }

    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    if (borderRadius) {
      roundRect(ctx, x, y, width, height, borderRadius);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, width, height);
    }

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

    bounds = { x, y, width, height, centerX: x + width / 2 };
  }

  return bounds;
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

function getFontSize(fontString) {
  const match = fontString.match(/(\d+)px/);
  return match ? parseInt(match[1], 10) : 72;
}

function setFontSize(fontString, newSize) {
  return fontString.replace(/(\d+)px/, `${newSize}px`);
}

function setFontFamily(fontString, newFamily) {
  return fontString.replace(/(\d+)px\s+.+$/, `$1px ${newFamily}`);
}

function setFontWeight(fontString, newWeight) {
  if (/^(italic\s+)?\d+\s+\d+px/.test(fontString)) {
    return fontString.replace(/^((?:italic\s+)?)\d+(\s+\d+px)/, `$1${newWeight}$2`);
  }

  if (/^\d+\s+\d+px/.test(fontString)) {
    return fontString.replace(/^\d+(\s+\d+px)/, `${newWeight}$1`);
  }

  return `${newWeight} ${fontString}`;
}

function buildLucideSvgDataUri(iconName, color) {
  const cacheKey = `${iconName}:${color}`;
  if (lucideSvgDataUriCache.has(cacheKey)) {
    return lucideSvgDataUriCache.get(cacheKey);
  }

  const IconComponent = curatedIconComponents[iconName];
  if (!IconComponent) {
    throw new Error(`Unknown icon: ${iconName}`);
  }

  const markup = renderToStaticMarkup(
    React.createElement(IconComponent, {
      color,
      size: 24,
      strokeWidth: 1.8,
    })
  );
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(markup).toString("base64")}`;
  lucideSvgDataUriCache.set(cacheKey, dataUri);
  return dataUri;
}

async function drawIcon(
  ctx,
  iconConfig,
  iconSource,
  iconName,
  iconImageBase64,
  iconColor,
  iconBackgroundColor,
  primaryColor
) {
  if (!iconConfig || iconSource === "none") return;

  const { x, y, size, iconInset = 20 } = iconConfig;
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const radius = size / 2;

  if (iconConfig.shadow) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = "rgba(15, 23, 42, 0.18)";
    ctx.shadowColor = iconConfig.shadow.color;
    ctx.shadowBlur = iconConfig.shadow.blur;
    ctx.shadowOffsetY = iconConfig.shadow.offsetY || 0;
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = iconBackgroundColor || primaryColor || "#2563eb";
  ctx.fill();
  ctx.clip();

  if (iconSource === "image" && iconImageBase64) {
    const image = await loadImage(iconImageBase64);
    const scale = Math.max(size / image.width, size / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const drawX = x + (size - drawWidth) / 2;
    const drawY = y + (size - drawHeight) / 2;
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  } else if (iconSource === "lucide" && iconName) {
    const svgDataUri = buildLucideSvgDataUri(iconName, iconColor || "#ffffff");
    const iconImage = await loadImage(svgDataUri);
    const innerSize = size - iconInset * 2;
    ctx.drawImage(iconImage, x + iconInset, y + iconInset, innerSize, innerSize);
  }

  ctx.restore();

  if (iconConfig.borderWidth) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - iconConfig.borderWidth / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.strokeStyle = iconConfig.borderColor || "#ffffff";
    ctx.lineWidth = iconConfig.borderWidth;
    ctx.stroke();
    ctx.restore();
  }
}

function drawNameText(
  ctx,
  canvas,
  nameConfig,
  name,
  primaryColor,
  surfaceBounds
) {
  if (!nameConfig || !name) return;

  ctx.fillStyle = primaryColor || nameConfig.defaultColor;
  ctx.font = nameConfig.font;

  const text =
    nameConfig.textTransform === "uppercase" ? name.toUpperCase() : name;
  const align = nameConfig.align || "center";
  let x;
  let y;

  if (nameConfig.x !== undefined) {
    x = nameConfig.x;
  } else if (align === "center") {
    x = canvas.width / 2;
  } else if (surfaceBounds) {
    x = surfaceBounds.x + 40;
  }

  if (nameConfig.y !== undefined) {
    y = nameConfig.y;
  } else if (surfaceBounds && nameConfig.offsetY) {
    y = surfaceBounds.y + nameConfig.offsetY;
  }

  ctx.textAlign = align;
  ctx.textBaseline = "middle";

  if (nameConfig.badge?.enabled) {
    const metrics = ctx.measureText(text);
    const badgePadding = nameConfig.badge.padding;
    const badgeWidth = metrics.width + badgePadding.x * 2;
    const badgeHeight = 30 + badgePadding.y;
    const badgeX = align === "center" ? x - badgeWidth / 2 : x - badgePadding.x;
    const badgeY = y - badgeHeight / 2;
    ctx.fillStyle = resolveTemplateColor(
      nameConfig.badge.color,
      nameConfig.badge.colorRole,
      primaryColor
    );
    roundRect(
      ctx,
      badgeX,
      badgeY,
      badgeWidth,
      badgeHeight,
      nameConfig.badge.borderRadius || 0
    );
    ctx.fill();
    ctx.fillStyle = primaryColor || nameConfig.defaultColor;
  }

  ctx.fillText(text, x, y);
  return y;
}

function drawMainText(
  ctx,
  canvas,
  mainTextConfig,
  mainText,
  mainTextColor,
  mainTextFontFamily,
  mainTextFontSize,
  surfaceBounds,
  nameY
) {
  if (!mainTextConfig || !mainText) return;

  const color = mainTextColor || mainTextConfig.defaultColor;
  let font = mainTextConfig.font;
  if (mainTextFontFamily) {
    font = setFontFamily(font, mainTextFontFamily);
  }
  font = setFontWeight(font, 700);
  if (mainTextFontSize) {
    font = setFontSize(font, mainTextFontSize);
  }
  if (mainTextConfig.style === "italic") {
    font = font.replace(/^(\d+)/, "italic $1");
  }

  const align = mainTextConfig.align || "center";
  ctx.textAlign = align;
  ctx.textBaseline = "middle";

  let maxWidth;
  if (mainTextConfig.maxWidth !== undefined) {
    if (mainTextConfig.maxWidth < 0 && surfaceBounds) {
      maxWidth = surfaceBounds.width + mainTextConfig.maxWidth;
    } else {
      maxWidth = mainTextConfig.maxWidth;
    }
  } else {
    maxWidth = canvas.width - 200;
  }

  const originalFontSize = getFontSize(font);
  const minFontSize = Math.max(
    originalFontSize * (mainTextConfig.minScale || 0.5),
    24
  );
  const maxLines = mainTextConfig.maxLines || 2;
  const maxHeight = surfaceBounds
    ? surfaceBounds.height * 0.8
    : canvas.height * 0.5;

  let currentFontSize = originalFontSize;
  let currentFont = font;
  let lines = [];
  let lineHeight = mainTextConfig.lineHeight || 80;

  while (currentFontSize >= minFontSize) {
    ctx.font = currentFont;
    lines = wrapText(ctx, mainText, maxWidth);
    const totalHeight = lines.length * lineHeight;

    if (lines.length <= maxLines && totalHeight <= maxHeight) {
      break;
    }

    currentFontSize -= 4;
    if (currentFontSize < minFontSize) {
      currentFontSize = minFontSize;
    }

    currentFont = setFontSize(font, currentFontSize);
    lineHeight =
      (mainTextConfig.lineHeight || 80) * (currentFontSize / originalFontSize);

    if (currentFontSize === minFontSize) {
      ctx.font = currentFont;
      lines = wrapText(ctx, mainText, maxWidth);
      break;
    }
  }

  ctx.font = currentFont;
  ctx.fillStyle = color;

  let x;
  let startY;
  if (mainTextConfig.x !== undefined) {
    x = mainTextConfig.x;
  } else if (align === "center") {
    x = canvas.width / 2;
  } else if (surfaceBounds) {
    x = surfaceBounds.x + 40;
  }

  if (mainTextConfig.y !== undefined) {
    startY = mainTextConfig.y;
  } else if (nameY && mainTextConfig.offsetY) {
    startY = nameY + mainTextConfig.offsetY;
  } else if (surfaceBounds) {
    startY = surfaceBounds.y + surfaceBounds.height / 2;
  }

  lines.forEach((line, index) => {
    ctx.fillText(line, x, startY + index * lineHeight);
  });
}

function drawSubtitle(ctx, subtitleConfig) {
  if (!subtitleConfig?.enabled) return;

  ctx.fillStyle = subtitleConfig.color;
  ctx.font = subtitleConfig.font;
  ctx.textAlign = subtitleConfig.align || "left";
  ctx.textBaseline = "middle";
  ctx.fillText(subtitleConfig.text, subtitleConfig.x, subtitleConfig.y);
}

function mirrorAlign(align) {
  if (align === "left") return "right";
  if (align === "right") return "left";
  return align;
}

function mirrorRectX(rect, canvasWidth) {
  if (!rect || rect.x === undefined || rect.width === undefined) return rect;
  return {
    ...rect,
    x: canvasWidth - rect.x - rect.width,
  };
}

function mirrorLine(decoration, canvasWidth) {
  return {
    ...decoration,
    x1: canvasWidth - decoration.x1,
    x2: canvasWidth - decoration.x2,
  };
}

function mirrorPolygon(decoration, canvasWidth) {
  return {
    ...decoration,
    points: decoration.points.map((point) => ({
      ...point,
      x: canvasWidth - point.x,
    })),
  };
}

function mirrorTextConfig(textConfig, canvasWidth) {
  if (!textConfig || textConfig.x === undefined) return textConfig;
  return {
    ...textConfig,
    x: canvasWidth - textConfig.x,
    align: mirrorAlign(textConfig.align || "center"),
  };
}

function mirrorIconConfig(iconConfig, canvasWidth) {
  if (!iconConfig) return iconConfig;
  return {
    ...iconConfig,
    x: canvasWidth - iconConfig.x - iconConfig.size,
  };
}

function mirrorPlacement(placement, canvasWidth) {
  if (!placement) return placement;
  return {
    ...placement,
    x: canvasWidth - placement.x - placement.width,
    alignX:
      placement.alignX === "left"
        ? "right"
        : placement.alignX === "right"
          ? "left"
          : placement.alignX,
  };
}

function resolveRenderConfig(template, flipBackgroundPosition) {
  const baseConfig = template.config;
  if (template.id !== "angledFrame" || !flipBackgroundPosition) {
    return baseConfig;
  }

  const canvasWidth = baseConfig.canvas.width;

  return {
    ...baseConfig,
    backgroundImagePlacement: mirrorPlacement(
      baseConfig.backgroundImagePlacement,
      canvasWidth
    ),
    icon: mirrorIconConfig(baseConfig.icon, canvasWidth),
    nameField: mirrorTextConfig(baseConfig.nameField, canvasWidth),
    mainTextField: mirrorTextConfig(baseConfig.mainTextField, canvasWidth),
    decorations: baseConfig.decorations.map((decoration) => {
      if (decoration.type === "rect") {
        return mirrorRectX(decoration, canvasWidth);
      }
      if (decoration.type === "line") {
        return mirrorLine(decoration, canvasWidth);
      }
      if (decoration.type === "polygon") {
        return mirrorPolygon(decoration, canvasWidth);
      }
      return decoration;
    }),
  };
}

export async function generateImage({
  templateId = "classic",
  name,
  mainText,
  background,
  iconSource = "none",
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
  flipBackgroundPosition = false,
  outputFilename,
  outputDir,
}) {
  const template = getTemplate(templateId);
  const config = resolveRenderConfig(template, flipBackgroundPosition);
  const canvas = createCanvas(config.canvas.width, config.canvas.height);
  const ctx = canvas.getContext("2d");

  await drawBackground(
    ctx,
    canvas,
    background,
    config.backgroundFallback,
    config.backgroundImagePlacement
  );
  drawDecorations(ctx, config.decorations, primaryColor);
  const surfaceBounds = drawSurface(
    ctx,
    canvas,
    config.surface,
    surfaceColor,
    surfaceOpacity
  );
  await drawIcon(
    ctx,
    config.icon,
    iconSource,
    iconName,
    iconImageBase64,
    iconColor,
    iconBackgroundColor,
    primaryColor
  );
  const nameY = drawNameText(
    ctx,
    canvas,
    config.nameField,
    name,
    primaryColor,
    surfaceBounds
  );
  drawMainText(
    ctx,
    canvas,
    config.mainTextField,
    mainText,
    mainTextColor,
    mainTextFontFamily,
    mainTextFontSize,
    surfaceBounds,
    nameY
  );
  drawSubtitle(ctx, config.subtitle);

  const targetDir = outputDir || generatedDir;
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const filename = outputFilename || `featured-image-${Date.now()}.webp`;
  const filepath = path.join(targetDir, filename);
  const buffer = canvas.toBuffer("image/webp", 80);
  fs.writeFileSync(filepath, buffer);

  return {
    filename,
    filepath,
    buffer,
  };
}
