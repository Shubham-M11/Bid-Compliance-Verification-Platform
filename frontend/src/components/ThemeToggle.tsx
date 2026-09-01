"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";

export type ThemeMode = "light" | "dark" | "system";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = (localStorage.getItem("gem_theme") as ThemeMode) || "system";
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    const root = document.documentElement;
    if (mode === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      root.setAttribute("data-theme", mode);
    }
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    localStorage.setItem("gem_theme", newTheme);
    applyTheme(newTheme);
  };

  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      applyTheme("system");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  if (!mounted) {
    return (
      <div
        style={{
          width: "80px",
          height: "28px",
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border-subtle)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-medium)",
        borderRadius: "var(--radius-sm)",
        padding: "2px",
        gap: "2px",
      }}
      title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
    >
      <button
        type="button"
        onClick={() => handleThemeChange("light")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "4px 6px",
          background: theme === "light" ? "var(--bg-primary)" : "transparent",
          color: theme === "light" ? "var(--brand-blue)" : "var(--text-muted)",
          border: theme === "light" ? "1px solid var(--border-subtle)" : "1px solid transparent",
          borderRadius: "var(--radius-xs)",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
        title="Light Mode"
        aria-label="Light Mode"
      >
        <Sun size={13} />
      </button>

      <button
        type="button"
        onClick={() => handleThemeChange("dark")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "4px 6px",
          background: theme === "dark" ? "var(--bg-primary)" : "transparent",
          color: theme === "dark" ? "var(--brand-blue)" : "var(--text-muted)",
          border: theme === "dark" ? "1px solid var(--border-subtle)" : "1px solid transparent",
          borderRadius: "var(--radius-xs)",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
        title="Dark Mode"
        aria-label="Dark Mode"
      >
        <Moon size={13} />
      </button>

      <button
        type="button"
        onClick={() => handleThemeChange("system")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "4px 6px",
          background: theme === "system" ? "var(--bg-primary)" : "transparent",
          color: theme === "system" ? "var(--brand-blue)" : "var(--text-muted)",
          border: theme === "system" ? "1px solid var(--border-subtle)" : "1px solid transparent",
          borderRadius: "var(--radius-xs)",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
        title="System Default"
        aria-label="System Default"
      >
        <Monitor size={13} />
      </button>
    </div>
  );
}
