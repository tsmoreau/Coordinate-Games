"use client";

import { useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";

export function FaviconUpdater() {
  const { theme } = useTheme();

  useEffect(() => {
    document.querySelectorAll("link[rel='icon']").forEach((el) => el.remove());
    document
      .querySelectorAll("link[rel='shortcut icon']")
      .forEach((el) => el.remove());

    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href =
      (theme === "dark" ? "/favicon-dark.svg" : "/favicon-light.svg") +
      "?v=" +
      Date.now();
    document.head.appendChild(link);
  }, [theme]);

  return null;
}
