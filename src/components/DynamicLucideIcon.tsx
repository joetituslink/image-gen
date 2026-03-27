import type { CSSProperties } from "react";
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
} as const;

interface DynamicLucideIconProps {
  name: string;
  className?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}

export function DynamicLucideIcon({
  name,
  className,
  strokeWidth = 1.8,
  style,
}: DynamicLucideIconProps) {
  const Icon = curatedIconComponents[name as keyof typeof curatedIconComponents];

  if (!Icon) {
    return <div className={className} style={style} />;
  }

  return <Icon className={className} strokeWidth={strokeWidth} style={style} />;
}
