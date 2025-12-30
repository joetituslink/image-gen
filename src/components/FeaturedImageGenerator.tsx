import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Image, Loader2, Upload, Check, Palette } from "lucide-react";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "";
const APP_NAME = import.meta.env.VITE_APP_NAME || "Featured Image Generator";
const APP_DESCRIPTION =
  import.meta.env.VITE_APP_DESCRIPTION ||
  "Create stunning blog featured images with custom text overlays";

interface TemplatePreview {
  bgGradient: string[];
  accentColor: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  preview: TemplatePreview;
}

const FeaturedImageGenerator = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("classic");
  const [categoryText, setCategoryText] = useState("HEALTH AND WELLNESS");
  const [mainText, setMainText] = useState(
    "How to Have a Better Work-Life Balance"
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bannerColor, setBannerColor] = useState<string>("");
  const [bannerOpacity, setBannerOpacity] = useState<number | undefined>(
    undefined
  );
  const [categoryColor, setCategoryColor] = useState<string>("");
  const [titleColor, setTitleColor] = useState<string>("");
  const [showColorOverrides, setShowColorOverrides] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch(`${API_URL}/api/templates`);
        if (!response.ok) {
          throw new Error(
            `Server returned ${response.status}: ${response.statusText}`
          );
        }
        const data = await response.json();
        if (data.success) {
          setTemplates(data.templates);
        } else {
          toast.error(
            `Failed to load templates: ${data.error || "Unknown error"}`
          );
        }
      } catch (error) {
        console.error("Failed to fetch templates:", error);
        toast.error(
          "Failed to load templates. Please ensure the backend server is running."
        );
      }
    };
    fetchTemplates();
  }, []);

  const handleBgUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setBgImage(event.target?.result as string);
          toast.success("Background image uploaded!");
        };
        reader.readAsDataURL(file);
      }
    },
    []
  );

  const generateImage = useCallback(async () => {
    if (!mainText.trim()) {
      toast.error("Please enter a main title");
      return;
    }

    setIsGenerating(true);

    try {
      const body: Record<string, unknown> = {
        templateId: selectedTemplate,
        categoryText,
        mainText,
        bgImageBase64: bgImage,
      };

      // Only include color overrides if they're set
      if (bannerColor) body.bannerColor = bannerColor;
      if (bannerOpacity !== undefined) body.bannerOpacity = bannerOpacity;
      if (categoryColor) body.categoryColor = categoryColor;
      if (titleColor) body.titleColor = titleColor;

      const response = await fetch(`${API_URL}/api/generate-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate image");
      }

      setGeneratedImage(data.downloadUrl);
      toast.success("Image generated successfully!");
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate image"
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    mainText,
    categoryText,
    bgImage,
    selectedTemplate,
    bannerColor,
    bannerOpacity,
    categoryColor,
    titleColor,
  ]);

  const downloadImage = useCallback(async () => {
    if (!generatedImage) return;

    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.download = `featured-image-${Date.now()}.png`;
      link.href = url;
      link.click();

      URL.revokeObjectURL(url);
      toast.success("Image downloaded!");
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("Failed to download image");
    }
  }, [generatedImage]);

  const resetColorOverrides = () => {
    setBannerColor("");
    setBannerOpacity(undefined);
    setCategoryColor("");
    setTitleColor("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="text-center">
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-white md:text-5xl">
            {APP_NAME}
          </h1>
          <p className="text-lg text-slate-400">{APP_DESCRIPTION}</p>
        </header>

        {/* Template Selector */}
        <div className="space-y-4">
          <Label className="text-lg font-semibold text-white">
            Choose a Template
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => {
                  setSelectedTemplate(template.id);
                  resetColorOverrides();
                }}
                className={`group relative overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                  selectedTemplate === template.id
                    ? "border-white shadow-lg shadow-white/20 scale-105"
                    : "border-slate-600 hover:border-slate-400"
                }`}
              >
                {/* Template Preview */}
                <div
                  className="aspect-video w-full relative"
                  style={{
                    background: `linear-gradient(135deg, ${template.preview.bgGradient[0]}, ${template.preview.bgGradient[1] || template.preview.bgGradient[0]})`,
                  }}
                >
                  {/* Simulated content preview */}
                  <div className="absolute inset-0 flex items-center justify-center p-3">
                    <div
                      className={`w-full rounded-md p-2 ${
                        template.id === "modernDark"
                          ? "bg-white/5 border border-white/10"
                          : template.id === "minimal"
                            ? "bg-transparent"
                            : template.id === "editorial"
                              ? "bg-transparent"
                              : "bg-white/80"
                      }`}
                    >
                      <div
                        className="h-1 w-8 rounded mb-1 mx-auto"
                        style={{
                          backgroundColor: template.preview.accentColor,
                        }}
                      />
                      <div
                        className={`h-2 w-16 rounded mx-auto ${
                          template.id === "modernDark"
                            ? "bg-white/80"
                            : "bg-slate-800/60"
                        }`}
                      />
                      <div
                        className={`h-1.5 w-12 rounded mx-auto mt-1 ${
                          template.id === "modernDark"
                            ? "bg-white/60"
                            : "bg-slate-800/40"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Selected indicator */}
                  {selectedTemplate === template.id && (
                    <div className="absolute top-2 right-2 bg-white rounded-full p-1">
                      <Check className="h-3 w-3 text-slate-900" />
                    </div>
                  )}
                </div>

                {/* Template Info */}
                <div className="bg-slate-800 p-3">
                  <h3 className="font-semibold text-white text-sm">
                    {template.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
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
            <CardContent className="space-y-4">
              {/* Category Text Input */}
              <div className="space-y-2">
                <Label className="text-slate-300">Category / Subtitle</Label>
                <Textarea
                  placeholder="Enter category text (e.g., HEALTH AND WELLNESS)"
                  value={categoryText}
                  onChange={(e) => setCategoryText(e.target.value)}
                  className="min-h-[60px] resize-none bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>

              {/* Main Title Input */}
              <div className="space-y-2">
                <Label className="text-slate-300">Main Title</Label>
                <Textarea
                  placeholder="Enter your main blog title..."
                  value={mainText}
                  onChange={(e) => setMainText(e.target.value)}
                  className="min-h-[80px] resize-none bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>

              {/* Background Image Upload */}
              <div className="space-y-2">
                <Label className="text-slate-300">
                  Background Image (Optional)
                </Label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleBgUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 border-slate-600 bg-slate-900/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {bgImage ? "Change Image" : "Upload Image"}
                  </Button>
                  {bgImage && (
                    <Button
                      variant="ghost"
                      onClick={() => setBgImage(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {bgImage && (
                  <img
                    src={bgImage}
                    alt="Background preview"
                    className="w-full h-20 object-cover rounded-md border border-slate-600"
                  />
                )}
              </div>

              {/* Color Overrides Toggle */}
              <div className="pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowColorOverrides(!showColorOverrides)}
                  className="w-full justify-between text-slate-300 hover:text-white hover:bg-slate-700"
                >
                  <span className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Color Overrides
                  </span>
                  <span className="text-xs text-slate-500">
                    {showColorOverrides ? "Hide" : "Show"}
                  </span>
                </Button>

                {showColorOverrides && (
                  <div className="mt-3 p-4 rounded-lg bg-slate-900/50 border border-slate-700 space-y-3">
                    <p className="text-xs text-slate-500 mb-3">
                      Override template defaults (leave empty to use template
                      colors)
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">
                          Banner Color
                        </Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="color"
                            value={bannerColor || "#ffffff"}
                            onChange={(e) => setBannerColor(e.target.value)}
                            className="w-10 h-8 p-0 border-0 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={bannerColor}
                            onChange={(e) => setBannerColor(e.target.value)}
                            placeholder="Default"
                            className="flex-1 h-8 text-xs bg-slate-800 border-slate-600 text-slate-300"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">
                          Banner Opacity
                        </Label>
                        <Input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={bannerOpacity ?? 0.85}
                          onChange={(e) =>
                            setBannerOpacity(parseFloat(e.target.value))
                          }
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">
                          Category Color
                        </Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="color"
                            value={categoryColor || "#c67c4e"}
                            onChange={(e) => setCategoryColor(e.target.value)}
                            className="w-10 h-8 p-0 border-0 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={categoryColor}
                            onChange={(e) => setCategoryColor(e.target.value)}
                            placeholder="Default"
                            className="flex-1 h-8 text-xs bg-slate-800 border-slate-600 text-slate-300"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">
                          Title Color
                        </Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="color"
                            value={titleColor || "#1a1a1a"}
                            onChange={(e) => setTitleColor(e.target.value)}
                            className="w-10 h-8 p-0 border-0 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={titleColor}
                            onChange={(e) => setTitleColor(e.target.value)}
                            placeholder="Default"
                            className="flex-1 h-8 text-xs bg-slate-800 border-slate-600 text-slate-300"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetColorOverrides}
                      className="w-full text-xs text-slate-500 hover:text-white mt-2"
                    >
                      Reset to Template Defaults
                    </Button>
                  </div>
                )}
              </div>

              <Button
                onClick={generateImage}
                disabled={isGenerating || !mainText.trim()}
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
                  <p className="text-sm text-slate-500">
                    Your image will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FeaturedImageGenerator;
