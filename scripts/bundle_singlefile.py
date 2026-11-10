#!/usr/bin/env python3
"""Bundles liftoff-rank-clone into a single portable HTML file for 1-tap AirDrop / iOS Files preview."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CSS_FILES = [
    ROOT / "src" / "styles" / "tokens.css",
    ROOT / "src" / "styles" / "app.css",
]

JS_FILES = [
    ROOT / "src" / "data" / "exercises.js",
    ROOT / "src" / "core" / "rankEngine.js",
    ROOT / "src" / "core" / "storage.js",
    ROOT / "src" / "core" / "i18n.js",
    ROOT / "src" / "ui" / "rankBadges.js",
    ROOT / "src" / "ui" / "bodygraphSvg.js",
    ROOT / "src" / "ui" / "soundFx.js",
    ROOT / "src" / "app.js",
]


def build_singlefile() -> Path:
    css_blob = "\n".join(p.read_text(encoding="utf-8") for p in CSS_FILES)
    js_blob = "\n".join(p.read_text(encoding="utf-8") for p in JS_FILES)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Liftoff — Ranked Gym Workouts &amp; Strength Bodyrank</title>
  <meta name="description" content="Log gym sets, calculate Epley 1RM scaled by bodyweight, and rank every lift &amp; muscle group across 9 tiers from Wood to Olympian.">
  <meta name="theme-color" content="#0D0E1B">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Liftoff">
  <style>
{css_blob}
  </style>
</head>
<body>
  <div class="app-shell" id="liftoff-app">
    <h1 class="sr-only">Liftoff — Ranked Gym Workouts</h1>
    <header id="app-header" class="top-status-bar"></header>
    <div id="app-view-host"></div>
    <nav id="bottom-dock" class="bottom-dock" aria-label="Primary Navigation"></nav>
  </div>
  <div id="picker-modal" class="modal-backdrop" hidden></div>
  <div id="celebration-modal" class="modal-backdrop" hidden></div>
  <div id="toast-container" style="position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:80;max-width:92vw;" hidden></div>
  <script>
{js_blob}
  </script>
</body>
</html>
"""
    out_path = ROOT / "liftoff-singlefile.html"
    out_path.write_text(html, encoding="utf-8")
    return out_path


if __name__ == "__main__":
    target = build_singlefile()
    print(f"Bundled: {target} ({target.stat().st_size} bytes)")
