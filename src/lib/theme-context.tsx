import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Theme = "light" | "dark";
type AccentColor = "red" | "blue" | "green" | "purple" | "orange";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "redistal-theme";
const ACCENT_COLOR_STORAGE_KEY = "redistal-accent-color";

function getInitialTheme(): Theme {
  // Check localStorage first
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  // Check system preference
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

function getInitialAccentColor(): AccentColor {
  const stored = localStorage.getItem(ACCENT_COLOR_STORAGE_KEY);
  if (
    stored === "red" ||
    stored === "blue" ||
    stored === "green" ||
    stored === "purple" ||
    stored === "orange"
  ) {
    return stored;
  }
  return "red"; // Default to red (Redis brand color)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme());
  const [accentColor, setAccentColorState] = useState<AccentColor>(() =>
    getInitialAccentColor(),
  );

  useEffect(() => {
    console.log("Theme effect running, theme:", theme);
    const root = window.document.documentElement;
    console.log("Before - root classes:", root.className);
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    console.log("After - root classes:", root.className);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (!stored) {
        setThemeState(e.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    console.log("toggleTheme called, current theme:", theme);
    setThemeState((prev) => {
      const newTheme = prev === "light" ? "dark" : "light";
      console.log("Setting new theme:", newTheme);
      return newTheme;
    });
  };

  const setAccentColor = (color: AccentColor) => {
    setAccentColorState(color);
    localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, color);
    applyAccentColor(color);
  };

  // Apply accent color to CSS variables
  const applyAccentColor = (color: AccentColor) => {
    const root = document.documentElement;

    // Color palettes for each accent
    const colorPalettes = {
      red: {
        50: "#fef2f2",
        100: "#fee2e2",
        200: "#fecaca",
        300: "#fca5a5",
        400: "#f87171",
        500: "#ef4444",
        600: "#dc2626",
        700: "#b91c1c",
        800: "#991b1b",
        900: "#7f1d1d",
        950: "#450a0a",
      },
      blue: {
        50: "#eff6ff",
        100: "#dbeafe",
        200: "#bfdbfe",
        300: "#93c5fd",
        400: "#60a5fa",
        500: "#3b82f6",
        600: "#2563eb",
        700: "#1d4ed8",
        800: "#1e40af",
        900: "#1e3a8a",
        950: "#172554",
      },
      green: {
        50: "#f0fdf4",
        100: "#dcfce7",
        200: "#bbf7d0",
        300: "#86efac",
        400: "#4ade80",
        500: "#22c55e",
        600: "#16a34a",
        700: "#15803d",
        800: "#166534",
        900: "#14532d",
        950: "#052e16",
      },
      purple: {
        50: "#faf5ff",
        100: "#f3e8ff",
        200: "#e9d5ff",
        300: "#d8b4fe",
        400: "#c084fc",
        500: "#a855f7",
        600: "#9333ea",
        700: "#7e22ce",
        800: "#6b21a8",
        900: "#581c87",
        950: "#3b0764",
      },
      orange: {
        50: "#fff7ed",
        100: "#ffedd5",
        200: "#fed7aa",
        300: "#fdba74",
        400: "#fb923c",
        500: "#f97316",
        600: "#ea580c",
        700: "#c2410c",
        800: "#9a3412",
        900: "#7c2d12",
        950: "#431407",
      },
    };

    const palette = colorPalettes[color];
    Object.entries(palette).forEach(([shade, value]) => {
      root.style.setProperty(`--color-brand-${shade}`, value);
    });
  };

  // Set initial accent color on mount
  useEffect(() => {
    applyAccentColor(accentColor);
  }, [accentColor]);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, toggleTheme, accentColor, setAccentColor }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
