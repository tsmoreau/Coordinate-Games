"use client";

import { useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";

export function FaviconUpdater() {
  const { theme } = useTheme();

  useEffect(() => {
    const favicon = document.querySelector(
      "link[rel='icon'][type='image/svg+xml']"
    ) as HTMLLinkElement | null;
    if (favicon) {
      favicon.href = theme === "dark" ? "/favicon-dark.svg" : "/favicon-light.svg";
    }
  }, [theme]);

  return null;
}
