import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Image, Loader2, Palette, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DynamicLucideIcon } from "@/components/DynamicLucideIcon";
import { FontDropdown } from "@/components/FontDropdown";
import { IconPickerModal } from "@/components/IconPickerModal";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "";
const APP_NAME = import.meta.env.VITE_APP_NAME || "Featured Image Generator";
const APP_DESCRIPTION =
  import.meta.env.VITE_APP_DESCRIPTION ||
  "Create stunning blog featured images with custom text overlays";

type BackgroundType = "color" | "gradient" | "image";
type IconSource = "none" | "lucide" | "image";

interface TemplatePreview {
  accentColor: string;
  bgGradient: string[];
}

interface TemplateDefaults {
  backgroundColor: string;
  backgroundGradientCss: string;
  backgroundType: BackgroundType;
  iconBackgroundColor: string;
  iconColor: string;
  iconName: string;
  iconSource: IconSource;
  mainText: string;
  mainTextColor: string;
  mainTextFontFamily: string;
  mainTextFontSize: number;
  name: string;
  primaryColor: string;
  surfaceColor: string;
  surfaceOpacity: number;
}

interface Template {
  defaults: TemplateDefaults;
  description: string;
  id: string;
  name: string;
  preview: TemplatePreview;
  previewImageUrl?: string;
  supportsIcon: boolean;
}

function parseLinearGradientCss(input: string) {
  const match = input.match(
    /^linear-gradient\(\s*(-?\d+(?:\.\d+)?)deg\s*,\s*([^,]+?)\s+0%\s*,\s*([^,]+?)\s+100%\s*\)$/i
  );
  if (!match) return null;

  return {
    angle: Number(match[1]),
    endColor: match[3].trim(),
    startColor: match[2].trim(),
  };
}

function buildGradientCss(angle: number, startColor: string, endColor: string) {
  return `linear-gradient(${angle}deg, ${startColor} 0%, ${endColor} 100%)`;
}

const FeaturedImageGenerator = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [name, setName] = useState("");
  const [mainText, setMainText] = useState("");
  const [backgroundType, setBackgroundType] = useState<BackgroundType>("gradient");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [backgroundGradientCss, setBackgroundGradientCss] = useState(
    buildGradientCss(135, "#667eea", "#764ba2")
  );
  const [gradientAngle, setGradientAngle] = useState(135);
  const [gradientStartColor, setGradientStartColor] = useState("#667eea");
  const [gradientEndColor, setGradientEndColor] = useState("#764ba2");
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundImageZoom, setBackgroundImageZoom] = useState(1);
  const [backgroundImageOffsetX, setBackgroundImageOffsetX] = useState(0);
  const [backgroundImageOffsetY, setBackgroundImageOffsetY] = useState(0);
  const [iconSource, setIconSource] = useState<IconSource>("none");
  const [iconName, setIconName] = useState("sparkles");
  const [iconImage, setIconImage] = useState<string | null>(null);
  const [iconColor, setIconColor] = useState("#ffffff");
  const [iconBackgroundColor, setIconBackgroundColor] = useState("#2563eb");
  const [surfaceColor, setSurfaceColor] = useState("#ffffff");
  const [surfaceOpacity, setSurfaceOpacity] = useState<number | undefined>(0.9);
  const [primaryColor, setPrimaryColor] = useState("#1f2937");
  const [mainTextColor, setMainTextColor] = useState("#111827");
  const [mainTextFontFamily, setMainTextFontFamily] = useState("Arial, sans-serif");
  const [mainTextFontSize, setMainTextFontSize] = useState(56);
  const [showStyleOverrides, setShowStyleOverrides] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const selectedTemplateData = useMemo(
    () => templates.find((template) => template.id === selectedTemplate) ?? null,
    [selectedTemplate, templates]
  );

  const applyTemplateDefaults = useCallback((template: Template) => {
    setSelectedTemplate(template.id);
    setName(template.defaults.name);
    setMainText(template.defaults.mainText);
    setBackgroundType(template.defaults.backgroundType);
    setBackgroundColor(template.defaults.backgroundColor);
    setBackgroundGradientCss(template.defaults.backgroundGradientCss);
    const parsedGradient = parseLinearGradientCss(template.defaults.backgroundGradientCss);
    if (parsedGradient) {
      setGradientAngle(parsedGradient.angle);
      setGradientStartColor(parsedGradient.startColor);
      setGradientEndColor(parsedGradient.endColor);
    }
    setBackgroundImage(null);
    setBackgroundImageZoom(1);
    setBackgroundImageOffsetX(0);
    setBackgroundImageOffsetY(0);
    if (backgroundInputRef.current) backgroundInputRef.current.value = "";
    setIconSource(template.defaults.iconSource);
    setIconName(template.defaults.iconName);
    setIconImage(null);
    if (iconInputRef.current) iconInputRef.current.value = "";
    setIconColor(template.defaults.iconColor);
    setIconBackgroundColor(template.defaults.iconBackgroundColor);
    setSurfaceColor(template.defaults.surfaceColor);
    setSurfaceOpacity(template.defaults.surfaceOpacity);
    setPrimaryColor(template.defaults.primaryColor);
    setMainTextColor(template.defaults.mainTextColor);
    setMainTextFontFamily(template.defaults.mainTextFontFamily);
    setMainTextFontSize(template.defaults.mainTextFontSize);
  }, []);

  const handlePrimaryColorChange = useCallback(
    (nextColor: string) => {
      setPrimaryColor((currentPrimaryColor) => {
        if (iconBackgroundColor === currentPrimaryColor) {
          setIconBackgroundColor(nextColor);
        }
        return nextColor;
      });
    },
    [iconBackgroundColor]
  );

  const handleTemplateSelect = useCallback(
    (template: Template) => {
      startTransition(() => applyTemplateDefaults(template));
    },
    [applyTemplateDefaults]
  );

  useEffect(() => {
    const controller = new AbortController();

    const fetchTemplates = async () => {
      try {
        const response = await fetch(`${API_URL}/api/templates`, {
          signal: controller.signal,
        });
        const contentType = response.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
          throw new Error("Server returned a non-JSON response");
        }

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to load templates");
        }

        const nextTemplates = data.templates as Template[];
        setTemplates(nextTemplates);
        const nextSelectedTemplate =
          nextTemplates.find((template) => template.id === selectedTemplate) ||
          nextTemplates[0];
        if (nextSelectedTemplate) {
          applyTemplateDefaults(nextSelectedTemplate);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to fetch templates:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load templates. Please ensure the backend server is running."
        );
      }
    };

    fetchTemplates();
    return () => controller.abort();
  }, [applyTemplateDefaults]);

  const syncGradientFromParts = useCallback(
    (angle: number, startColor: string, endColor: string) => {
      setGradientAngle(angle);
      setGradientStartColor(startColor);
      setGradientEndColor(endColor);
      setBackgroundGradientCss(buildGradientCss(angle, startColor, endColor));
    },
    []
  );

  const handleGradientCssChange = useCallback((value: string) => {
    setBackgroundGradientCss(value);
    const parsed = parseLinearGradientCss(value);
    if (parsed) {
      setGradientAngle(parsed.angle);
      setGradientStartColor(parsed.startColor);
      setGradientEndColor(parsed.endColor);
    }
  }, []);

  const handleBackgroundUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setBackgroundImage(loadEvent.target?.result as string);
        setBackgroundType("image");
        setBackgroundImageZoom(1);
        setBackgroundImageOffsetX(0);
        setBackgroundImageOffsetY(0);
        toast.success("Background image uploaded");
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleIconUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setIconImage(loadEvent.target?.result as string);
        setIconSource("image");
        toast.success("Icon image uploaded");
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const clearBackgroundImage = useCallback(() => {
    setBackgroundImage(null);
    setBackgroundImageZoom(1);
    setBackgroundImageOffsetX(0);
    setBackgroundImageOffsetY(0);
    if (backgroundInputRef.current) backgroundInputRef.current.value = "";
  }, []);

  const clearIconImage = useCallback(() => {
    setIconImage(null);
    if (iconInputRef.current) iconInputRef.current.value = "";
  }, []);

  const generateImage = useCallback(async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (name.trim().length > 25) {
      toast.error("Name must be 25 characters or fewer");
      return;
    }
    if (!mainText.trim()) {
      toast.error("Main text is required");
      return;
    }
    if (mainText.trim().length > 70) {
      toast.error("Main text must be 70 characters or fewer");
      return;
    }
    if (backgroundType === "image" && !backgroundImage) {
      toast.error("Upload a background image to use image mode");
      return;
    }
    if (backgroundType === "gradient" && !parseLinearGradientCss(backgroundGradientCss)) {
      toast.error("Use a valid linear-gradient value for the background");
      return;
    }
    if (iconSource === "image" && !iconImage) {
      toast.error("Upload an icon image or switch icon mode");
      return;
    }

    setIsGenerating(true);
    try {
      const body: Record<string, unknown> = {
        templateId: selectedTemplate,
        name: name.trim(),
        mainText: mainText.trim(),
        backgroundType,
        iconSource,
        primaryColor,
        mainTextColor,
        mainTextFontFamily,
        mainTextFontSize,
        surfaceColor,
      };

      if (surfaceOpacity !== undefined) body.surfaceOpacity = surfaceOpacity;

      if (backgroundType === "color") {
        body.backgroundColor = backgroundColor;
      } else if (backgroundType === "gradient") {
        body.backgroundGradientCss = backgroundGradientCss;
      } else {
        body.backgroundImageBase64 = backgroundImage;
        body.backgroundImageZoom = backgroundImageZoom;
        body.backgroundImageOffsetX = backgroundImageOffsetX;
        body.backgroundImageOffsetY = backgroundImageOffsetY;
      }

      if (iconSource === "lucide") {
        body.iconName = iconName;
        body.iconColor = iconColor;
        body.iconBackgroundColor = iconBackgroundColor;
      } else if (iconSource === "image") {
        body.iconImageBase64 = iconImage;
      }

      const response = await fetch(`${API_URL}/api/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error("Server returned a non-JSON response");
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate image");
      }

      setGeneratedImage(data.downloadUrl);
      toast.success("Image generated successfully");
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  }, [
    backgroundColor,
    backgroundGradientCss,
    backgroundImage,
    backgroundImageOffsetX,
    backgroundImageOffsetY,
    backgroundImageZoom,
    backgroundType,
    iconBackgroundColor,
    iconColor,
    iconImage,
    iconName,
    iconSource,
    mainText,
    mainTextColor,
    mainTextFontFamily,
    mainTextFontSize,
    name,
    primaryColor,
    selectedTemplate,
    surfaceColor,
    surfaceOpacity,
  ]);

  const downloadImage = useCallback(async () => {
    if (!generatedImage) return;
    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `featured-image-${Date.now()}.webp`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("Failed to download image");
    }
  }, [generatedImage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="text-center">
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-white md:text-5xl">
            {APP_NAME}
          </h1>
          <p className="text-lg text-slate-400">{APP_DESCRIPTION}</p>
        </header>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-lg font-semibold text-white">Choose a Template</Label>
            <span className="text-sm text-slate-400">
              {selectedTemplateData?.name || "Select"}
            </span>
          </div>
          <div className="overflow-x-auto pb-1">
            <div className="flex min-w-max gap-2">
              {templates.map((template) => (
                <button
                  key={`compact-${template.id}`}
                  type="button"
                  onClick={() => handleTemplateSelect(template)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
                    selectedTemplate === template.id
                      ? "border-white bg-white text-slate-900 shadow-lg shadow-white/10"
                      : "border-slate-600 bg-slate-900/60 text-slate-300 hover:border-slate-400 hover:text-white"
                  }`}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleTemplateSelect(template)}
                className={`group overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                  selectedTemplate === template.id
                    ? "scale-105 border-white shadow-lg shadow-white/20"
                    : "border-slate-600 hover:border-slate-400"
                }`}
              >
                <div className="aspect-video w-full">
                  {template.previewImageUrl ? (
                    <img
                      src={template.previewImageUrl}
                      alt={`${template.name} preview`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="h-full w-full"
                      style={{
                        background: `linear-gradient(135deg, ${template.preview.bgGradient[0]}, ${template.preview.bgGradient[1] || template.preview.bgGradient[0]})`,
                      }}
                    />
                  )}
                </div>
                <div className="bg-slate-800 p-3 text-left">
                  <h3 className="text-sm font-semibold text-white">{template.name}</h3>
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                    {template.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Image className="h-5 w-5" />
                Content & Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-slate-300">Name</Label>
                  <span className="text-xs text-slate-500">{name.length}/25</span>
                </div>
                <Input
                  value={name}
                  maxLength={25}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter a name"
                  className="bg-slate-900/50 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-slate-300">Main Text</Label>
                  <span className="text-xs text-slate-500">{mainText.length}/70</span>
                </div>
                <Textarea
                  value={mainText}
                  maxLength={70}
                  onChange={(event) => setMainText(event.target.value)}
                  placeholder="Enter the main message"
                  rows={4}
                  className="resize-none bg-slate-900/50 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
                <div>
                  <Label className="text-slate-300">Main Text Font</Label>
                  <p className="mt-1 text-xs text-slate-500">
                    Choose the font family and size for the main text only.
                  </p>
                </div>
                <FontDropdown
                  value={mainTextFontFamily}
                  onChange={setMainTextFontFamily}
                />
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-xs text-slate-400">Main Text Font Size</Label>
                    <Input
                      type="number"
                      min={24}
                      max={120}
                      value={mainTextFontSize}
                      onChange={(event) =>
                        setMainTextFontSize(
                          Math.max(24, Math.min(120, Number(event.target.value) || 24))
                        )
                      }
                      className="w-24 bg-slate-950/70 text-white"
                    />
                  </div>
                  <Input
                    type="range"
                    min="24"
                    max="120"
                    value={mainTextFontSize}
                    onChange={(event) => setMainTextFontSize(Number(event.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
                <div>
                  <Label className="text-slate-300">Background Type</Label>
                  <p className="mt-1 text-xs text-slate-500">
                    Choose a color, gradient, or uploaded image background.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["color", "gradient", "image"] as BackgroundType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setBackgroundType(type)}
                      className={`rounded-xl border px-3 py-3 text-sm font-medium capitalize transition ${
                        backgroundType === type
                          ? "border-white bg-slate-800 text-white"
                          : "border-slate-700 bg-slate-950/70 text-slate-400 hover:border-slate-500 hover:text-white"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {backgroundType === "color" && (
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-400">Background Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={backgroundColor}
                        onChange={(event) => setBackgroundColor(event.target.value)}
                        className="h-10 w-14 cursor-pointer p-1"
                      />
                      <Input
                        value={backgroundColor}
                        onChange={(event) => setBackgroundColor(event.target.value)}
                        className="bg-slate-950/70 text-white"
                      />
                    </div>
                  </div>
                )}

                {backgroundType === "gradient" && (
                  <div className="space-y-3">
                    <div
                      className="h-20 rounded-2xl border border-slate-700"
                      style={{ background: backgroundGradientCss }}
                    />
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-400">Start Color</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={gradientStartColor}
                            onChange={(event) =>
                              syncGradientFromParts(
                                gradientAngle,
                                event.target.value,
                                gradientEndColor
                              )
                            }
                            className="h-10 w-14 cursor-pointer p-1"
                          />
                          <Input
                            value={gradientStartColor}
                            onChange={(event) =>
                              syncGradientFromParts(
                                gradientAngle,
                                event.target.value,
                                gradientEndColor
                              )
                            }
                            className="bg-slate-950/70 text-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-400">End Color</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={gradientEndColor}
                            onChange={(event) =>
                              syncGradientFromParts(
                                gradientAngle,
                                gradientStartColor,
                                event.target.value
                              )
                            }
                            className="h-10 w-14 cursor-pointer p-1"
                          />
                          <Input
                            value={gradientEndColor}
                            onChange={(event) =>
                              syncGradientFromParts(
                                gradientAngle,
                                gradientStartColor,
                                event.target.value
                              )
                            }
                            className="bg-slate-950/70 text-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-400">Angle</Label>
                        <Input
                          type="range"
                          min="0"
                          max="360"
                          value={gradientAngle}
                          onChange={(event) =>
                            syncGradientFromParts(
                              Number(event.target.value),
                              gradientStartColor,
                              gradientEndColor
                            )
                          }
                        />
                        <div className="text-xs text-slate-500">{gradientAngle}deg</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-400">Manual Gradient Config</Label>
                      <Input
                        value={backgroundGradientCss}
                        onChange={(event) => handleGradientCssChange(event.target.value)}
                        className="bg-slate-950/70 text-white"
                      />
                    </div>
                  </div>
                )}

                {backgroundType === "image" && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        ref={backgroundInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleBackgroundUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => backgroundInputRef.current?.click()}
                        className="flex-1 border-slate-600 bg-slate-900/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {backgroundImage ? "Change Image" : "Upload Image"}
                      </Button>
                      {backgroundImage && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={clearBackgroundImage}
                          className="text-slate-400 hover:text-white"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    {backgroundImage && (
                      <>
                        <img
                          src={backgroundImage}
                          alt="Background preview"
                          className="h-28 w-full rounded-xl border border-slate-700 object-contain bg-slate-950/60"
                        />
                        <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/50 p-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                              <Label className="text-xs text-slate-400">
                                Background Zoom
                              </Label>
                              <span>{backgroundImageZoom.toFixed(2)}x</span>
                            </div>
                            <Input
                              type="range"
                              min="1"
                              max="3"
                              step="0.01"
                              value={backgroundImageZoom}
                              onChange={(event) =>
                                setBackgroundImageZoom(Number(event.target.value))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                              <Label className="text-xs text-slate-400">
                                Horizontal Position
                              </Label>
                              <span>{backgroundImageOffsetX}</span>
                            </div>
                            <Input
                              type="range"
                              min="-100"
                              max="100"
                              step="1"
                              value={backgroundImageOffsetX}
                              onChange={(event) =>
                                setBackgroundImageOffsetX(Number(event.target.value))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                              <Label className="text-xs text-slate-400">
                                Vertical Position
                              </Label>
                              <span>{backgroundImageOffsetY}</span>
                            </div>
                            <Input
                              type="range"
                              min="-100"
                              max="100"
                              step="1"
                              value={backgroundImageOffsetY}
                              onChange={(event) =>
                                setBackgroundImageOffsetY(Number(event.target.value))
                              }
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {selectedTemplateData?.supportsIcon && (
                <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
                  <div>
                    <Label className="text-slate-300">Icon or Icon Image</Label>
                    <p className="mt-1 text-xs text-slate-500">
                      Add an optional Lucide icon or upload a custom icon image.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["none", "lucide", "image"] as IconSource[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setIconSource(type);
                          if (type !== "image") clearIconImage();
                        }}
                        className={`rounded-xl border px-3 py-3 text-sm font-medium capitalize transition ${
                          iconSource === type
                            ? "border-white bg-slate-800 text-white"
                            : "border-slate-700 bg-slate-950/70 text-slate-400 hover:border-slate-500 hover:text-white"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  {iconSource === "lucide" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
                        <div>
                          <div className="text-sm font-medium text-white">Selected Icon</div>
                          <div className="mt-1 text-xs text-slate-500">{iconName}</div>
                        </div>
                        <div
                          className="flex h-14 w-14 items-center justify-center rounded-full"
                          style={{ backgroundColor: iconBackgroundColor }}
                        >
                          <DynamicLucideIcon
                            name={iconName}
                            className="h-7 w-7"
                            style={{ color: iconColor }}
                            strokeWidth={1.8}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsIconPickerOpen(true)}
                        className="w-full border-slate-600 bg-slate-900/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        Choose Icon
                      </Button>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-slate-400">Icon Color</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              value={iconColor}
                              onChange={(event) => setIconColor(event.target.value)}
                              className="h-10 w-14 cursor-pointer p-1"
                            />
                            <Input
                              value={iconColor}
                              onChange={(event) => setIconColor(event.target.value)}
                              className="bg-slate-950/70 text-white"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-slate-400">Icon Background</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              value={iconBackgroundColor}
                              onChange={(event) =>
                                setIconBackgroundColor(event.target.value)
                              }
                              className="h-10 w-14 cursor-pointer p-1"
                            />
                            <Input
                              value={iconBackgroundColor}
                              onChange={(event) =>
                                setIconBackgroundColor(event.target.value)
                              }
                              className="bg-slate-950/70 text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {iconSource === "image" && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          ref={iconInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleIconUpload}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => iconInputRef.current?.click()}
                          className="flex-1 border-slate-600 bg-slate-900/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {iconImage ? "Change Icon Image" : "Upload Icon Image"}
                        </Button>
                        {iconImage && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={clearIconImage}
                            className="text-slate-400 hover:text-white"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                      {iconImage && (
                        <img
                          src={iconImage}
                          alt="Icon preview"
                          className="h-24 w-24 rounded-2xl border border-slate-700 object-contain bg-slate-950/60"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowStyleOverrides((value) => !value)}
                  className="w-full justify-between text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Style Overrides
                  </span>
                  <span className="text-xs text-slate-500">
                    {showStyleOverrides ? "Hide" : "Show"}
                  </span>
                </Button>

                {showStyleOverrides && (
                  <div className="mt-3 space-y-3 rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Surface Color</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={surfaceColor}
                            onChange={(event) => setSurfaceColor(event.target.value)}
                            className="h-10 w-14 cursor-pointer p-1"
                          />
                          <Input
                            value={surfaceColor}
                            onChange={(event) => setSurfaceColor(event.target.value)}
                            className="bg-slate-950/70 text-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Surface Opacity</Label>
                        <Input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={surfaceOpacity ?? 0.9}
                          onChange={(event) => setSurfaceOpacity(Number(event.target.value))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Primary Color</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={primaryColor}
                            onChange={(event) =>
                              handlePrimaryColorChange(event.target.value)
                            }
                            className="h-10 w-14 cursor-pointer p-1"
                          />
                          <Input
                            value={primaryColor}
                            onChange={(event) =>
                              handlePrimaryColorChange(event.target.value)
                            }
                            className="bg-slate-950/70 text-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Main Text Color</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            value={mainTextColor}
                            onChange={(event) => setMainTextColor(event.target.value)}
                            className="h-10 w-14 cursor-pointer p-1"
                          />
                          <Input
                            value={mainTextColor}
                            onChange={(event) => setMainTextColor(event.target.value)}
                            className="bg-slate-950/70 text-white"
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (!selectedTemplateData) return;
                        handleTemplateSelect(selectedTemplateData);
                      }}
                      className="w-full text-xs text-slate-500 hover:text-white"
                    >
                      Reset to Template Defaults
                    </Button>
                  </div>
                )}
              </div>

              <Button
                onClick={generateImage}
                disabled={isGenerating || !selectedTemplateData}
                className="w-full bg-white text-slate-900 hover:bg-slate-200"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Image"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <span>Preview</span>
                {generatedImage && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={downloadImage}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {generatedImage ? (
                <img
                  src={generatedImage}
                  alt="Generated featured image"
                  className="w-full rounded-lg border border-slate-600 shadow-lg"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-slate-600 bg-slate-900/30">
                  <p className="text-sm text-slate-500">Your image will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <IconPickerModal
        open={isIconPickerOpen}
        selectedIcon={iconName}
        onClose={() => setIsIconPickerOpen(false)}
        onSelect={(nextIcon) => setIconName(nextIcon)}
      />
    </div>
  );
};

export default FeaturedImageGenerator;
