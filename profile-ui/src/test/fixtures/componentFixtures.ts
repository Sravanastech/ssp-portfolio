import { vi } from "vitest";
import { LucideIcon } from "lucide-react";
import { ThemeColors } from "@/theme/themeConfig";

export interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index?: number;
}

// Mock icon component that matches LucideIcon interface
const mockIcon = (() => null) as unknown as LucideIcon;

export const mockServiceCard: ServiceCardProps = {
  icon: mockIcon,
  title: "Example Service",
  description:
    "Example service description that demonstrates the component behavior.",
};

export const mockThemeColors: ThemeColors = {
  primary: "#000000",
  secondary: "#666666",
  accent: "#FFFDF2",
  background: "#FFFDF2",
  surface: "#FFFFFF",
  text: "#000000",
  textSecondary: "#666666",
  border: "#E5E2D3",
  borderLight: "#F0EDE4",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  shadow: "rgba(0, 0, 0, 0.1)",
};

export interface ThemeContextType {
  colors: ThemeColors;
  currentTheme: "woodland" | "sunrise" | "ocean";
  setTheme: ReturnType<typeof vi.fn>;
}

export const mockThemeContext: ThemeContextType = {
  colors: mockThemeColors,
  currentTheme: "woodland",
  setTheme: vi.fn(),
};
