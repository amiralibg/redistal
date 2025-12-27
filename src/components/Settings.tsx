import { Sun, Moon, Palette, Check } from "lucide-react";
import { useTheme } from "../lib/theme-context";
import { Dialog, Button } from "./ui";
import clsx from "clsx";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACCENT_COLORS = [
  { id: "red" as const, name: "Red (Default)", light: "#dc2626", dark: "#ef4444" },
  { id: "blue" as const, name: "Blue", light: "#2563eb", dark: "#3b82f6" },
  { id: "green" as const, name: "Green", light: "#16a34a", dark: "#22c55e" },
  { id: "purple" as const, name: "Purple", light: "#9333ea", dark: "#a855f7" },
  { id: "orange" as const, name: "Orange", light: "#ea580c", dark: "#f97316" },
];

export function Settings({ isOpen, onClose }: SettingsProps) {
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="space-y-6">
        {/* Theme Section */}
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
            Appearance
          </h3>
          <div className="space-y-2">
            <label className="text-xs text-neutral-600 dark:text-neutral-400 block mb-2">
              Theme
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTheme("light")}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all",
                  theme === "light"
                    ? "border-brand-600 bg-brand-50 dark:bg-brand-500/10"
                    : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600",
                )}
              >
                <Sun className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-neutral-900 dark:text-white">
                    Light
                  </div>
                </div>
                {theme === "light" && (
                  <Check className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                )}
              </button>

              <button
                onClick={() => setTheme("dark")}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all",
                  theme === "dark"
                    ? "border-brand-600 bg-brand-50 dark:bg-brand-500/10"
                    : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600",
                )}
              >
                <Moon className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-neutral-900 dark:text-white">
                    Dark
                  </div>
                </div>
                {theme === "dark" && (
                  <Check className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Accent Color Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Accent Color
            </h3>
          </div>
          <div className="space-y-2">
            {ACCENT_COLORS.map((color) => (
              <button
                key={color.id}
                onClick={() => setAccentColor(color.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all",
                  accentColor === color.id
                    ? "border-brand-600 bg-brand-50 dark:bg-brand-500/10"
                    : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600",
                )}
              >
                <div className="flex gap-1">
                  <div
                    className="w-5 h-5 rounded border border-neutral-300 dark:border-neutral-600"
                    style={{ backgroundColor: color.light }}
                  />
                  <div
                    className="w-5 h-5 rounded border border-neutral-300 dark:border-neutral-600"
                    style={{ backgroundColor: color.dark }}
                  />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-neutral-900 dark:text-white">
                    {color.name}
                  </div>
                </div>
                {accentColor === color.id && (
                  <Check className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <Button onClick={onClose} variant="primary">
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
