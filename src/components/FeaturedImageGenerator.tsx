import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronDown,
  Copy,
  Download,
  Image,
  Loader2,
  Palette,
  Upload,
} from "lucide-react";
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
type MainTextFontWeight = "normal" | "bold";

interface TemplatePreview {
  accentColor: string;
  bgGradient: string[];
}

interface TemplateDefaults {
  backgroundColor: string;
  backgroundGradientCss: string;
  backgroundType: BackgroundType;
  flipBackgroundPosition?: boolean;
  iconBackgroundColor: string;
  iconColor: string;
  iconName: string;
  iconPositionX: number;
  iconPositionY: number;
  iconSource: IconSource;
  mainText: string;
  mainTextColor: string;
  mainTextFontFamily: string;
  mainTextFontSize: number;
  mainTextFontWeight: MainTextFontWeight;
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

interface TemplateSelectorProps {
  onSelect: (template: Template) => void;
  selectedTemplate: string;
  selectedTemplateName?: string;
  templates: Template[];
}

interface PreviewPanelProps {
  isLoading: boolean;
  onDownload: () => void;
  previewError: string | null;
  previewImageUrl: string | null;
}

interface GenerateRequestPayload {
  backgroundColor?: string;
  backgroundGradientCss?: string;
  backgroundImage: string;
  backgroundImageOffsetX?: number;
  backgroundImageOffsetY?: number;
  backgroundImageZoom?: number;
  backgroundType: BackgroundType;
  flipBackgroundPosition?: boolean;
  iconBackgroundColor?: string;
  iconColor?: string;
  iconImage: string;
  iconPositionX?: number;
  iconPositionY?: number;
  iconScale?: number;
  iconName?: string;
  iconSource: IconSource;
  mainText: string;
  mainTextColor: string;
  mainTextFontFamily: string;
  mainTextFontSize: number;
  mainTextFontWeight: MainTextFontWeight;
  name: string;
  primaryColor: string;
  surfaceColor: string;
  surfaceOpacity?: number;
  templateId: string;
}

type GeneratePayloadResult =
  | {
      isValid: true;
      payload: GenerateRequestPayload;
    }
  | {
      error: string;
      isValid: false;
    };

interface ApiConfigAccordionProps {
  curlCommand: string;
  isOpen: boolean;
  jsonPayload: string;
  onCopyCurl: () => void;
  onCopyJson: () => void;
  onToggle: () => void;
  payloadResult: GeneratePayloadResult;
  requestUrl: string;
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

function toBashSingleQuoted(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function buildCurlCommand(requestUrl: string, payload: GenerateRequestPayload) {
  return [
    `curl -X POST ${toBashSingleQuoted(requestUrl)} \\`,
    "  -H 'Content-Type: application/json' \\",
    `  -d ${toBashSingleQuoted(JSON.stringify(payload))}`,
  ].join("\n");
}

const TemplateSelector = memo(function TemplateSelector({
  onSelect,
  selectedTemplate,
  selectedTemplateName,
  templates,
}: TemplateSelectorProps) {
  return (
    <div className="space-y-4 [contain:layout_paint]">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-lg font-semibold text-white">Choose a Template</Label>
        <span className="text-sm text-slate-400">{selectedTemplateName || "Select"}</span>
      </div>
      <div className="overflow-x-auto pb-1 [scrollbar-width:thin]">
        <div className="flex min-w-max gap-2">
          {templates.map((template) => (
            <button
              key={`compact-${template.id}`}
              type="button"
              onClick={() => onSelect(template)}
              className={`rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                selectedTemplate === template.id
                  ? "border-white bg-white text-slate-900"
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
            onClick={() => onSelect(template)}
            className={`group overflow-hidden rounded-xl border-2 transition-colors ${
              selectedTemplate === template.id
                ? "border-white bg-slate-900"
                : "border-slate-700 bg-slate-900/70 hover:border-slate-500"
            }`}
          >
            <div className="aspect-video w-full">
              {template.previewImageUrl ? (
                <img
                  src={template.previewImageUrl}
                  alt={`${template.name} preview`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
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
            <div className="bg-slate-800/95 p-3 text-left">
              <h3 className="text-sm font-semibold text-white">{template.name}</h3>
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                {template.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});

const PreviewPanel = memo(function PreviewPanel({
  isLoading,
  onDownload,
  previewError,
  previewImageUrl,
}: PreviewPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!previewImageUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    let isCancelled = false;
    const previewImage = new window.Image();
    previewImage.decoding = "async";
    previewImage.onload = () => {
      if (isCancelled) return;

      canvas.width = previewImage.naturalWidth;
      canvas.height = previewImage.naturalHeight;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(previewImage, 0, 0, canvas.width, canvas.height);
    };
    previewImage.src = previewImageUrl;

    return () => {
      isCancelled = true;
    };
  }, [previewImageUrl]);

  return (
    <Card className="border-slate-700 bg-slate-800/40 [contain:layout_paint]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white">
          <span>Preview</span>
          {previewImageUrl && (
            <Button
              size="sm"
              variant="outline"
              onClick={onDownload}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
              disabled={isLoading}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {previewImageUrl ? (
          <div className="space-y-3">
            <div
              className="relative"
              onContextMenu={(event) => event.preventDefault()}
            >
              <canvas
                ref={canvasRef}
                aria-label="Live featured image preview"
                className="block w-full rounded-lg border border-slate-600 shadow-lg"
              />
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
                <div className="absolute left-4 top-3">
                  <span className="select-none text-[10px] font-medium tracking-[0.22em] text-white/14">
                    Rankima.com
                  </span>
                </div>
                <div className="absolute bottom-3 right-4">
                  <span className="select-none text-[10px] font-medium tracking-[0.22em] text-white/14">
                    Rankima.com
                  </span>
                </div>
              </div>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-950/45 backdrop-blur-[1px]">
                  <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/85 px-3 py-2 text-sm text-slate-200">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating preview...
                  </div>
                </div>
              )}
            </div>
            {previewError && (
              <p className="text-xs text-amber-200">{previewError}</p>
            )}
            <p className="text-[11px] text-slate-500">
              Preview includes a Rankima.com watermark. Click Download to save the full image without it.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-slate-600 bg-slate-900/30">
              <p className="text-sm text-slate-500">
                {isLoading ? "Building preview..." : "Your image will appear here"}
              </p>
            </div>
            {previewError ? (
              <p className="text-xs text-amber-200">{previewError}</p>
            ) : (
              <p className="text-xs text-slate-500">
                The preview initializes automatically as soon as the current settings are valid.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

const ApiConfigAccordion = memo(function ApiConfigAccordion({
  curlCommand,
  isOpen,
  jsonPayload,
  onCopyCurl,
  onCopyJson,
  onToggle,
  payloadResult,
  requestUrl,
}: ApiConfigAccordionProps) {
  const codeBlockClassName =
    "max-h-64 overflow-auto rounded-xl border border-slate-700 bg-slate-950/80 p-4 text-xs leading-relaxed text-slate-300 whitespace-pre-wrap break-all";

  return (
    <Card className="border-slate-700 bg-slate-800/40 [contain:layout_paint]">
      <CardHeader className="pb-4">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-left transition-colors hover:border-slate-500"
        >
          <div>
            <div className="text-lg font-semibold text-white">API Config</div>
            <p className="mt-1 text-sm text-slate-400">
              Copy the exact current request body and cURL command.
            </p>
          </div>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </CardHeader>
      {isOpen && (
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-900">
                POST
              </span>
              <code className="text-xs text-slate-300 break-all">{requestUrl}</code>
            </div>
          </div>

          {payloadResult.isValid === false && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {payloadResult.error}
            </div>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">JSON Body</h3>
                <p className="text-xs text-slate-500">
                  Exact payload accepted by <code>/api/generate-image</code>.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onCopyJson}
                disabled={!payloadResult.isValid}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy JSON
              </Button>
            </div>
            <pre className={codeBlockClassName}>
              {payloadResult.isValid
                ? jsonPayload
                : "Complete required fields to enable copyable API config."}
            </pre>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">cURL</h3>
                <p className="text-xs text-slate-500">
                  Ready-to-run request for the current design state.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onCopyCurl}
                disabled={!payloadResult.isValid}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy cURL
              </Button>
            </div>
            <pre className={codeBlockClassName}>
              {payloadResult.isValid
                ? curlCommand
                : "The cURL example will appear once the current form state is valid."}
            </pre>
          </section>
        </CardContent>
      )}
    </Card>
  );
});

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
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
  const [backgroundImageZoom, setBackgroundImageZoom] = useState(1);
  const [backgroundImageOffsetX, setBackgroundImageOffsetX] = useState(0);
  const [backgroundImageOffsetY, setBackgroundImageOffsetY] = useState(0);
  const [flipBackgroundPosition, setFlipBackgroundPosition] = useState(false);
  const [iconSource, setIconSource] = useState<IconSource>("none");
  const [iconName, setIconName] = useState("sparkles");
  const [iconImageUrl, setIconImageUrl] = useState("");
  const [iconPositionX, setIconPositionX] = useState(50);
  const [iconPositionY, setIconPositionY] = useState(50);
  const [iconScale, setIconScale] = useState(1);
  const [iconColor, setIconColor] = useState("#ffffff");
  const [iconBackgroundColor, setIconBackgroundColor] = useState("#2563eb");
  const [surfaceColor, setSurfaceColor] = useState("#ffffff");
  const [surfaceOpacity, setSurfaceOpacity] = useState<number | undefined>(0.9);
  const [primaryColor, setPrimaryColor] = useState("#1f2937");
  const [mainTextColor, setMainTextColor] = useState("#111827");
  const [mainTextFontFamily, setMainTextFontFamily] = useState("Arial, sans-serif");
  const [mainTextFontSize, setMainTextFontSize] = useState(56);
  const [mainTextFontWeight, setMainTextFontWeight] =
    useState<MainTextFontWeight>("bold");
  const [showStyleOverrides, setShowStyleOverrides] = useState(false);
  const [isApiConfigOpen, setIsApiConfigOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const latestPreviewBlobRef = useRef<Blob | null>(null);
  const previewRequestIdRef = useRef(0);
  const selectedTemplateRef = useRef(selectedTemplate);

  const selectedTemplateData = useMemo(
    () => templates.find((template) => template.id === selectedTemplate) ?? null,
    [selectedTemplate, templates]
  );
  const apiBaseUrl = useMemo(() => {
    const runtimeBaseUrl =
      API_URL || (typeof window !== "undefined" ? window.location.origin : "");
    return runtimeBaseUrl.replace(/\/$/, "");
  }, []);
  const requestUrl = useMemo(
    () => (apiBaseUrl ? `${apiBaseUrl}/api/generate-image` : "/api/generate-image"),
    [apiBaseUrl]
  );
  const previewRequestUrl = useMemo(
    () => (apiBaseUrl ? `${apiBaseUrl}/api/preview-image` : "/api/preview-image"),
    [apiBaseUrl]
  );
  const uploadRequestUrl = useMemo(
    () => (apiBaseUrl ? `${apiBaseUrl}/api/upload-image` : "/api/upload-image"),
    [apiBaseUrl]
  );

  useEffect(() => {
    selectedTemplateRef.current = selectedTemplate;
  }, [selectedTemplate]);

  useEffect(() => {
    return () => {
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [previewImageUrl]);

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
    setBackgroundImageUrl("");
    setBackgroundImageZoom(1);
    setBackgroundImageOffsetX(0);
    setBackgroundImageOffsetY(0);
    setFlipBackgroundPosition(Boolean(template.defaults.flipBackgroundPosition));
    if (backgroundInputRef.current) backgroundInputRef.current.value = "";
    setIconSource(template.defaults.iconSource);
    setIconName(template.defaults.iconName);
    setIconImageUrl("");
    setIconPositionX(template.defaults.iconPositionX);
    setIconPositionY(template.defaults.iconPositionY);
    setIconScale(1);
    if (iconInputRef.current) iconInputRef.current.value = "";
    setIconColor(template.defaults.iconColor);
    setIconBackgroundColor(template.defaults.iconBackgroundColor);
    setSurfaceColor(template.defaults.surfaceColor);
    setSurfaceOpacity(template.defaults.surfaceOpacity);
    setPrimaryColor(template.defaults.primaryColor);
    setMainTextColor(template.defaults.mainTextColor);
    setMainTextFontFamily(template.defaults.mainTextFontFamily);
    setMainTextFontSize(template.defaults.mainTextFontSize);
    setMainTextFontWeight(template.defaults.mainTextFontWeight);
    setPreviewError(null);
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
          nextTemplates.find(
            (template) => template.id === selectedTemplateRef.current
          ) ||
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

  const uploadImageFile = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(uploadRequestUrl, {
        method: "POST",
        body: formData,
      });
      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error("Server returned a non-JSON upload response");
      }

      const data = await response.json();
      if (!response.ok || !data.success || typeof data.url !== "string") {
        throw new Error(data.error || "Failed to upload image");
      }

      return data.url;
    },
    [uploadRequestUrl]
  );

  const handleBackgroundUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        setIsUploadingBackground(true);
        const uploadedUrl = await uploadImageFile(file);
        setBackgroundType("image");
        setBackgroundImageUrl(uploadedUrl);
        setBackgroundImageZoom(1);
        setBackgroundImageOffsetX(0);
        setBackgroundImageOffsetY(0);
        toast.success("Background image uploaded");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to upload image");
      } finally {
        setIsUploadingBackground(false);
      }
    },
    [uploadImageFile]
  );

  const handleIconUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        setIsUploadingIcon(true);
        const uploadedUrl = await uploadImageFile(file);
        setIconImageUrl(uploadedUrl);
        setIconSource("image");
        toast.success("Icon image uploaded");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to upload icon");
      } finally {
        setIsUploadingIcon(false);
      }
    },
    [uploadImageFile]
  );

  const clearBackgroundImage = useCallback(() => {
    setBackgroundImageUrl("");
    setBackgroundImageZoom(1);
    setBackgroundImageOffsetX(0);
    setBackgroundImageOffsetY(0);
    if (backgroundInputRef.current) backgroundInputRef.current.value = "";
  }, []);

  const clearIconImage = useCallback(() => {
    setIconImageUrl("");
    if (iconInputRef.current) iconInputRef.current.value = "";
  }, []);

  const generatePayloadResult = useMemo<GeneratePayloadResult>(() => {
    const trimmedName = name.trim();
    const trimmedMainText = mainText.trim();
    const trimmedBackgroundImageUrl = backgroundImageUrl.trim();
    const trimmedIconImageUrl = iconImageUrl.trim();

    if (!trimmedName) {
      return {
        error: "Complete required fields to enable copyable API config. Name is required.",
        isValid: false,
      };
    }
    if (trimmedName.length > 25) {
      return {
        error:
          "Complete required fields to enable copyable API config. Name must be 25 characters or fewer.",
        isValid: false,
      };
    }
    if (!trimmedMainText) {
      return {
        error: "Complete required fields to enable copyable API config. Main text is required.",
        isValid: false,
      };
    }
    if (trimmedMainText.length > 70) {
      return {
        error:
          "Complete required fields to enable copyable API config. Main text must be 70 characters or fewer.",
        isValid: false,
      };
    }
    if (!mainTextFontFamily) {
      return {
        error:
          "Complete required fields to enable copyable API config. Main text font family is required.",
        isValid: false,
      };
    }
    if (!["normal", "bold"].includes(mainTextFontWeight)) {
      return {
        error:
          "Complete required fields to enable copyable API config. Main text font weight must be normal or bold.",
        isValid: false,
      };
    }
    if (mainTextFontSize < 24 || mainTextFontSize > 120) {
      return {
        error:
          "Complete required fields to enable copyable API config. Main text font size must be between 24 and 120.",
        isValid: false,
      };
    }
    if (iconPositionX < 0 || iconPositionX > 100) {
      return {
        error:
          "Complete required fields to enable copyable API config. Icon horizontal position must be between 0 and 100.",
        isValid: false,
      };
    }
    if (iconPositionY < 0 || iconPositionY > 100) {
      return {
        error:
          "Complete required fields to enable copyable API config. Icon vertical position must be between 0 and 100.",
        isValid: false,
      };
    }
    if (iconScale < 0.4 || iconScale > 2.5) {
      return {
        error:
          "Complete required fields to enable copyable API config. Icon size must be between 0.4 and 2.5.",
        isValid: false,
      };
    }
    if (backgroundType === "gradient" && !parseLinearGradientCss(backgroundGradientCss)) {
      return {
        error:
          "Complete required fields to enable copyable API config. Use a valid linear-gradient value for the background.",
        isValid: false,
      };
    }
    if (backgroundType === "image" && !trimmedBackgroundImageUrl) {
      return {
        error:
          "Complete required fields to enable copyable API config. Add a background image URL or upload an image to use image mode.",
        isValid: false,
      };
    }
    if (iconSource === "image" && !trimmedIconImageUrl) {
      return {
        error:
          "Complete required fields to enable copyable API config. Upload an icon image or switch icon mode.",
        isValid: false,
      };
    }

    const payload: GenerateRequestPayload = {
      templateId: selectedTemplate,
      name: trimmedName,
      mainText: trimmedMainText,
      backgroundType,
      backgroundImage: backgroundType === "image" ? trimmedBackgroundImageUrl : "",
      iconSource,
      iconImage: iconSource === "image" ? trimmedIconImageUrl : "",
      primaryColor,
      mainTextColor,
      mainTextFontFamily,
      mainTextFontSize,
      mainTextFontWeight,
      surfaceColor,
    };

    if (surfaceOpacity !== undefined) {
      payload.surfaceOpacity = surfaceOpacity;
    }

    if (backgroundType === "color") {
      payload.backgroundColor = backgroundColor;
    } else if (backgroundType === "gradient") {
      payload.backgroundGradientCss = backgroundGradientCss;
    } else {
      payload.backgroundImageZoom = backgroundImageZoom;
      payload.backgroundImageOffsetX = backgroundImageOffsetX;
      payload.backgroundImageOffsetY = backgroundImageOffsetY;
      payload.flipBackgroundPosition = flipBackgroundPosition;
    }

    if (iconSource === "lucide") {
      payload.iconName = iconName;
      payload.iconColor = iconColor;
      payload.iconBackgroundColor = iconBackgroundColor;
    }

    if (iconSource !== "none") {
      payload.iconPositionX = iconPositionX;
      payload.iconPositionY = iconPositionY;
      payload.iconScale = iconScale;
    }

    return {
      isValid: true,
      payload,
    };
  }, [
    backgroundColor,
    backgroundGradientCss,
    backgroundImageUrl,
    backgroundImageOffsetX,
    backgroundImageOffsetY,
    backgroundImageZoom,
    backgroundType,
    flipBackgroundPosition,
    iconBackgroundColor,
    iconColor,
    iconImageUrl,
    iconPositionX,
    iconPositionY,
    iconScale,
    iconName,
    iconSource,
    mainText,
    mainTextColor,
    mainTextFontFamily,
    mainTextFontSize,
    mainTextFontWeight,
    name,
    primaryColor,
    selectedTemplate,
    surfaceColor,
    surfaceOpacity,
  ]);

  const jsonPayload = useMemo(
    () =>
      generatePayloadResult.isValid
        ? JSON.stringify(generatePayloadResult.payload, null, 2)
        : "",
    [generatePayloadResult]
  );

  const curlCommand = useMemo(
    () =>
      generatePayloadResult.isValid
        ? buildCurlCommand(requestUrl, generatePayloadResult.payload)
        : "",
    [generatePayloadResult, requestUrl]
  );

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast.error("Clipboard is not available in this browser");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      console.error(`Failed to copy ${label}:`, error);
      toast.error(`Failed to copy ${label}`);
    }
  }, []);

  const handleCopyJson = useCallback(async () => {
    if (!generatePayloadResult.isValid) return;
    await copyToClipboard(jsonPayload, "JSON body");
  }, [copyToClipboard, generatePayloadResult, jsonPayload]);

  const handleCopyCurl = useCallback(async () => {
    if (!generatePayloadResult.isValid) return;
    await copyToClipboard(curlCommand, "cURL command");
  }, [copyToClipboard, curlCommand, generatePayloadResult]);

  useEffect(() => {
    if (!selectedTemplateData) return;

    if (generatePayloadResult.isValid === false) {
      setIsPreviewLoading(false);
      setPreviewError(generatePayloadResult.error);
      return;
    }

    const previewRequestId = previewRequestIdRef.current + 1;
    previewRequestIdRef.current = previewRequestId;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsPreviewLoading(true);

      try {
        const response = await fetch(previewRequestUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(generatePayloadResult.payload),
          signal: controller.signal,
        });

        const contentType = response.headers.get("content-type") || "";
        if (!response.ok) {
          if (contentType.includes("application/json")) {
            const data = await response.json();
            throw new Error(data.error || "Failed to generate preview");
          }
          throw new Error("Server returned an invalid preview response");
        }

        if (!contentType.startsWith("image/")) {
          throw new Error("Preview response was not an image");
        }

        const blob = await response.blob();
        if (controller.signal.aborted || previewRequestId !== previewRequestIdRef.current) {
          return;
        }

        latestPreviewBlobRef.current = blob;
        setPreviewError(null);
        setPreviewImageUrl((currentPreviewImageUrl) => {
          if (currentPreviewImageUrl) {
            URL.revokeObjectURL(currentPreviewImageUrl);
          }
          return URL.createObjectURL(blob);
        });
      } catch (error) {
        if (controller.signal.aborted || previewRequestId !== previewRequestIdRef.current) {
          return;
        }

        console.error("Error generating preview image:", error);
        setPreviewError(
          error instanceof Error ? error.message : "Failed to generate preview"
        );
      } finally {
        if (!controller.signal.aborted && previewRequestId === previewRequestIdRef.current) {
          setIsPreviewLoading(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [generatePayloadResult, previewRequestUrl, selectedTemplateData]);

  const downloadImage = useCallback(async () => {
    if (!latestPreviewBlobRef.current) {
      toast.error("Preview is not ready yet");
      return;
    }

    try {
      const url = URL.createObjectURL(latestPreviewBlobRef.current);
      const link = document.createElement("a");
      link.download = `featured-image-${Date.now()}.webp`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("Failed to download image");
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 md:p-12">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="text-center">
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-white md:text-5xl">
            {APP_NAME}
          </h1>
          <p className="text-lg text-slate-400">{APP_DESCRIPTION}</p>
        </header>

        <TemplateSelector
          templates={templates}
          selectedTemplate={selectedTemplate}
          selectedTemplateName={selectedTemplateData?.name}
          onSelect={handleTemplateSelect}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-700 bg-slate-800/40 [contain:layout_paint]">
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
                  <Label className="text-xs text-slate-400">Main Text Weight</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["normal", "bold"] as MainTextFontWeight[]).map((weight) => (
                      <button
                        key={weight}
                        type="button"
                        onClick={() => setMainTextFontWeight(weight)}
                        className={`rounded-xl border px-3 py-3 text-sm font-medium capitalize transition ${
                          mainTextFontWeight === weight
                            ? "border-white bg-slate-800 text-white"
                            : "border-slate-700 bg-slate-950/70 text-slate-400 hover:border-slate-500 hover:text-white"
                        }`}
                      >
                        {weight}
                      </button>
                    ))}
                  </div>
                </div>
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
                        disabled={isUploadingBackground}
                        className="flex-1 border-slate-600 bg-slate-900/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        {isUploadingBackground ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        {backgroundImageUrl ? "Change Image" : "Upload Image"}
                      </Button>
                      {backgroundImageUrl && (
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
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-400">Background Image URL</Label>
                      <Input
                        value={backgroundImageUrl}
                        onChange={(event) => setBackgroundImageUrl(event.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="bg-slate-950/70 text-white placeholder:text-slate-500"
                      />
                    </div>
                    {backgroundImageUrl && (
                      <>
                        <img
                          src={backgroundImageUrl}
                          alt="Background preview"
                          className="h-28 w-full rounded-xl border border-slate-700 object-contain bg-slate-950/60"
                          decoding="async"
                        />
                        <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/50 p-3">
                          {selectedTemplate === "angledFrame" && (
                            <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-3">
                              <div>
                                <div className="text-sm font-medium text-white">
                                  Flip Background Position
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  Move the image to the left and the angled design to the right.
                                </div>
                              </div>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={flipBackgroundPosition}
                                onClick={() =>
                                  setFlipBackgroundPosition((currentValue) => !currentValue)
                                }
                                className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors ${
                                  flipBackgroundPosition
                                    ? "border-white bg-white"
                                    : "border-slate-600 bg-slate-800"
                                }`}
                              >
                                <span
                                  className={`inline-block h-5 w-5 rounded-full transition-transform ${
                                    flipBackgroundPosition
                                      ? "translate-x-6 bg-slate-900"
                                      : "translate-x-1 bg-white"
                                  }`}
                                />
                              </button>
                            </label>
                          )}
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
                          disabled={isUploadingIcon}
                          className="flex-1 border-slate-600 bg-slate-900/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                        >
                          {isUploadingIcon ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="mr-2 h-4 w-4" />
                          )}
                          {iconImageUrl ? "Change Icon Image" : "Upload Icon Image"}
                        </Button>
                        {iconImageUrl && (
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
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-400">Icon Image URL</Label>
                      <Input
                        value={iconImageUrl}
                        onChange={(event) => setIconImageUrl(event.target.value)}
                        placeholder="https://example.com/icon.png"
                        className="bg-slate-950/70 text-white placeholder:text-slate-500"
                      />
                    </div>
                    {iconImageUrl && (
                      <img
                        src={iconImageUrl}
                        alt="Icon preview"
                        className="h-24 w-24 rounded-2xl border border-slate-700 object-contain bg-slate-950/60"
                        decoding="async"
                      />
                    )}
                  </div>
                )}

                  {iconSource !== "none" && (
                    <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-950/50 p-2.5">
                      <div className="pb-1">
                        <Label className="text-xs text-slate-400">Icon Position & Size</Label>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                          <Label className="text-xs text-slate-400">
                            Horizontal Position
                          </Label>
                          <span>{iconPositionX.toFixed(0)}%</span>
                        </div>
                        <Input
                          type="range"
                          min="0"
                          max="100"
                          step="0.1"
                          value={iconPositionX}
                          onChange={(event) => setIconPositionX(Number(event.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                          <Label className="text-xs text-slate-400">
                            Vertical Position
                          </Label>
                          <span>{iconPositionY.toFixed(0)}%</span>
                        </div>
                        <Input
                          type="range"
                          min="0"
                          max="100"
                          step="0.1"
                          value={iconPositionY}
                          onChange={(event) => setIconPositionY(Number(event.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                          <Label className="text-xs text-slate-400">Icon Size</Label>
                          <span>{iconScale.toFixed(2)}x</span>
                        </div>
                        <Input
                          type="range"
                          min="0.4"
                          max="2.5"
                          step="0.01"
                          value={iconScale}
                          onChange={(event) => setIconScale(Number(event.target.value))}
                        />
                      </div>
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
            </CardContent>
          </Card>

          <div className="space-y-4 lg:self-start lg:sticky lg:top-6">
            <PreviewPanel
              isLoading={isPreviewLoading}
              onDownload={downloadImage}
              previewError={previewError}
              previewImageUrl={previewImageUrl}
            />
            <ApiConfigAccordion
              curlCommand={curlCommand}
              isOpen={isApiConfigOpen}
              jsonPayload={jsonPayload}
              onCopyCurl={handleCopyCurl}
              onCopyJson={handleCopyJson}
              onToggle={() => setIsApiConfigOpen((currentValue) => !currentValue)}
              payloadResult={generatePayloadResult}
              requestUrl={requestUrl}
            />
          </div>
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
