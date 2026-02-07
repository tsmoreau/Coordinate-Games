"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/components/ThemeProvider";

function setFavicon(isDark: boolean) {
  document.querySelectorAll("link[rel='icon']").forEach((el) => el.remove());
  document
    .querySelectorAll("link[rel='shortcut icon']")
    .forEach((el) => el.remove());

  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href =
    (isDark ? "/favicon-dark.svg" : "/favicon-light.svg") +
    "?v=" +
    Date.now();
  document.head.appendChild(link);
}

export function FaviconUpdater() {
  const { theme } = useTheme();
  const initialSet = useRef(false);

  useEffect(() => {
    if (!initialSet.current) {
      initialSet.current = true;
      const stored = localStorage.getItem("theme");
      if (stored) {
        setFavicon(stored === "dark");
      } else {
        setFavicon(window.matchMedia("(prefers-color-scheme: dark)").matches);
      }
      return;
    }
    setFavicon(theme === "dark");
  }, [theme]);

  return null;
}
