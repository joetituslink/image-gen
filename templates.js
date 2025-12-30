import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Template configurations for featured image generation
 * Each template defines layout, colors, fonts, and styling
 */

export const templates = {
  // Template 1: Classic - Clean centered banner with serif title
  classic: {
    id: "classic",
    name: "Classic",
    description: "Clean centered banner with elegant serif typography",
    preview: {
      bgGradient: ["#e8e4df", "#d4cfc9"],
      accentColor: "#c67c4e",
    },
    config: {
      canvas: { width: 1200, height: 630 },
      background: {
        type: "gradient",
        gradient: {
          type: "linear",
          angle: 45,
          stops: [
            { offset: 0, color: "#e8e4df" },
            { offset: 1, color: "#d4cfc9" },
          ],
        },
      },
      banner: {
        type: "centered",
        height: 340,
        padding: 100,
        defaultColor: "#ffffff",
        defaultOpacity: 0.85,
      },
      category: {
        font: "500 24px Arial, sans-serif",
        defaultColor: "#c67c4e",
        textTransform: "uppercase",
        letterSpacing: 4,
        offsetY: 70,
      },
      title: {
        font: "400 64px Georgia, Times New Roman, serif",
        defaultColor: "#1a1a1a",
        lineHeight: 80,
        offsetY: 80,
        maxWidth: -160, // relative to banner width
      },
    },
  },

  // Template 2: Modern Dark - Bold dark theme with gradient accent
  modernDark: {
    id: "modernDark",
    name: "Modern Dark",
    description: "Bold dark theme with vibrant gradient accents",
    preview: {
      bgGradient: ["#1a1a2e", "#16213e"],
      accentColor: "#e94560",
    },
    config: {
      canvas: { width: 1200, height: 630 },
      background: {
        type: "gradient",
        gradient: {
          type: "linear",
          angle: 135,
          stops: [
            { offset: 0, color: "#1a1a2e" },
            { offset: 0.5, color: "#16213e" },
            { offset: 1, color: "#0f3460" },
          ],
        },
      },
      decorations: [
        {
          type: "circle",
          x: 1100,
          y: 100,
          radius: 200,
          color: "rgba(233, 69, 96, 0.15)",
        },
        {
          type: "circle",
          x: 100,
          y: 530,
          radius: 150,
          color: "rgba(233, 69, 96, 0.1)",
        },
      ],
      banner: {
        type: "left",
        x: 80,
        y: 120,
        width: 700,
        height: 390,
        defaultColor: "#ffffff",
        defaultOpacity: 0.05,
        borderRadius: 20,
        border: {
          width: 2,
          color: "rgba(233, 69, 96, 0.3)",
        },
      },
      category: {
        font: "700 18px Arial, sans-serif",
        defaultColor: "#e94560",
        textTransform: "uppercase",
        letterSpacing: 6,
        x: 120,
        y: 180,
        align: "left",
      },
      title: {
        font: "700 52px Arial, sans-serif",
        defaultColor: "#ffffff",
        lineHeight: 68,
        x: 120,
        y: 260,
        align: "left",
        maxWidth: 620,
      },
    },
  },

  // Template 3: Minimal - Ultra clean with bottom accent bar
  minimal: {
    id: "minimal",
    name: "Minimal",
    description: "Ultra clean design with subtle bottom accent",
    preview: {
      bgGradient: ["#fafafa", "#f0f0f0"],
      accentColor: "#2563eb",
    },
    config: {
      canvas: { width: 1200, height: 630 },
      background: {
        type: "solid",
        color: "#fafafa",
      },
      decorations: [
        {
          type: "rect",
          x: 0,
          y: 590,
          width: 1200,
          height: 40,
          color: "#2563eb",
        },
        {
          type: "line",
          x1: 100,
          y1: 200,
          x2: 300,
          y2: 200,
          strokeWidth: 3,
          color: "#2563eb",
        },
      ],
      category: {
        font: "500 16px Arial, sans-serif",
        defaultColor: "#2563eb",
        textTransform: "uppercase",
        letterSpacing: 8,
        x: 100,
        y: 240,
        align: "left",
      },
      title: {
        font: "300 58px Georgia, serif",
        defaultColor: "#1f2937",
        lineHeight: 75,
        x: 100,
        y: 320,
        align: "left",
        maxWidth: 900,
      },
    },
  },

  // Template 4: Vibrant - Colorful gradient with floating card
  vibrant: {
    id: "vibrant",
    name: "Vibrant",
    description: "Colorful gradient background with floating card",
    preview: {
      bgGradient: ["#667eea", "#764ba2"],
      accentColor: "#fbbf24",
    },
    config: {
      canvas: { width: 1200, height: 630 },
      background: {
        type: "gradient",
        gradient: {
          type: "linear",
          angle: 135,
          stops: [
            { offset: 0, color: "#667eea" },
            { offset: 0.5, color: "#764ba2" },
            { offset: 1, color: "#f093fb" },
          ],
        },
      },
      decorations: [
        {
          type: "circle",
          x: 200,
          y: 100,
          radius: 80,
          color: "rgba(255, 255, 255, 0.1)",
        },
        {
          type: "circle",
          x: 1000,
          y: 500,
          radius: 120,
          color: "rgba(255, 255, 255, 0.08)",
        },
        {
          type: "circle",
          x: 900,
          y: 150,
          radius: 40,
          color: "rgba(255, 255, 255, 0.15)",
        },
      ],
      banner: {
        type: "floating",
        x: 100,
        y: 115,
        width: 1000,
        height: 400,
        defaultColor: "#ffffff",
        defaultOpacity: 0.95,
        borderRadius: 24,
        shadow: {
          blur: 60,
          color: "rgba(0, 0, 0, 0.25)",
          offsetY: 20,
        },
      },
      category: {
        font: "700 16px Arial, sans-serif",
        defaultColor: "#7c3aed",
        textTransform: "uppercase",
        letterSpacing: 6,
        y: 200,
        align: "center",
        badge: {
          enabled: true,
          padding: { x: 20, y: 10 },
          color: "rgba(124, 58, 237, 0.1)",
          borderRadius: 20,
        },
      },
      title: {
        font: "700 54px Arial, sans-serif",
        defaultColor: "#1f2937",
        lineHeight: 70,
        y: 290,
        align: "center",
        maxWidth: 800,
      },
    },
  },

  // Template 5: Editorial - Magazine-style with large typography
  editorial: {
    id: "editorial",
    name: "Editorial",
    description: "Magazine-style layout with bold typography",
    preview: {
      bgGradient: ["#fef3e2", "#fde8d0"],
      accentColor: "#ea580c",
    },
    config: {
      canvas: { width: 1200, height: 630 },
      background: {
        type: "gradient",
        gradient: {
          type: "linear",
          angle: 180,
          stops: [
            { offset: 0, color: "#fef3e2" },
            { offset: 1, color: "#fde8d0" },
          ],
        },
      },
      decorations: [
        {
          type: "rect",
          x: 0,
          y: 0,
          width: 12,
          height: 630,
          color: "#ea580c",
        },
        {
          type: "line",
          x1: 80,
          y1: 550,
          x2: 400,
          y2: 550,
          strokeWidth: 2,
          color: "#ea580c",
        },
      ],
      category: {
        font: "400 14px Georgia, serif",
        defaultColor: "#ea580c",
        textTransform: "uppercase",
        letterSpacing: 10,
        x: 80,
        y: 120,
        align: "left",
      },
      title: {
        font: "400 72px Georgia, serif",
        defaultColor: "#292524",
        lineHeight: 85,
        x: 80,
        y: 200,
        align: "left",
        maxWidth: 1000,
        style: "italic",
      },
      subtitle: {
        enabled: true,
        font: "400 20px Georgia, serif",
        color: "#78716c",
        x: 80,
        y: 570,
        align: "left",
        text: "Featured Article",
      },
    },
  },

  // Template 6: Prayer Cover - Classic style with prayer background image
  prayerCover: {
    id: "prayerCover",
    name: "Prayer Cover",
    description:
      "Spiritual themed cover with soft pink-cyan gradient background",
    preview: {
      bgGradient: ["#7dd3fc", "#f9a8d4"],
      accentColor: "#be185d",
    },
    config: {
      canvas: { width: 1200, height: 630 },
      background: {
        type: "image",
        imagePath: path.join(__dirname, "assets", "prayer-bg.png"),
      },
      banner: {
        type: "centered",
        height: 340,
        padding: 100,
        defaultColor: "#ffffff",
        defaultOpacity: 0.9,
      },
      category: {
        font: "500 24px Arial, sans-serif",
        defaultColor: "#be185d",
        textTransform: "uppercase",
        letterSpacing: 4,
        offsetY: 70,
      },
      title: {
        font: "400 64px Georgia, Times New Roman, serif",
        defaultColor: "#1e293b",
        lineHeight: 80,
        offsetY: 80,
        maxWidth: -160,
      },
    },
  },
};

export const getTemplate = (templateId) => {
  return templates[templateId] || templates.classic;
};

export const getTemplateList = () => {
  return Object.values(templates).map(({ id, name, description, preview }) => ({
    id,
    name,
    description,
    preview,
  }));
};
