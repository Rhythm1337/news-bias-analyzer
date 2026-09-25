"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Mode = "light" | "dark";

const STORAGE_KEY = "nba-theme";

function getSnapshot(): Mode {
  const m = document.documentElement.getAttribute("data-mode");
  return m === "dark" ? "dark" : "light";
}

function getServerSnapshot(): Mode {
  // SSR has no DOM; default to light to match the layout's default attr.
  return "light";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-mode"],
  });
  return () => observer.disconnect();
}

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // The bootstrap script flips data-mode before paint, so the server-rendered
  // icon may not match the client's actual mode. Wait for hydration to commit
  // before painting either icon to avoid a hydration mismatch warning.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Mounted flag exists exclusively to gate post-hydration rendering of the
    // theme icon, which can differ from SSR. The setState here is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  function toggle() {
    const next: Mode = mode === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-mode", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-ghost"
      aria-label={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
      title={mode === "light" ? "Dark mode" : "Light mode"}
      style={{ padding: "6px 10px" }}
    >
      {mounted ? (
        mode === "light" ? (
          <Moon size={14} aria-hidden />
        ) : (
          <Sun size={14} aria-hidden />
        )
      ) : (
        <span
          aria-hidden
          style={{ display: "inline-block", width: 14, height: 14 }}
        />
      )}
    </button>
  );
}
