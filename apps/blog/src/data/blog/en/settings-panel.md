---
author: Souloss
pubDatetime: 2026-03-21T00:00:00.000Z
modDatetime: 2026-03-30T00:00:00.000Z
title: Settings Panel & Preferences
featured: false
category: Tutorial/Configuration
tags:
  - docs
  - configuration
description: "Learn about astro-minimax settings panel features, including appearance, reading, layout, and general settings."
---

astro-minimax introduces a brand new settings panel for personalizing your blog's appearance and experience.

## Opening the Settings Panel

Click the settings icon (gear icon) in the bottom-right corner of the page to open the settings panel.

## Settings Options

### Appearance Settings

| Option | Description | Values |
|--------|-------------|--------|
| **Color Scheme** | Theme color palette | teal, ocean, rose, forest, midnight, sunset, mono, github |
| **Border Radius** | Component corner radius | Small, Medium, Large, XL |
| **Font Size** | Global font scaling | 0.85x - 1.25x |

### Reading Settings

| Option | Description | Values |
|--------|-------------|--------|
| **Reading Mode** | Toggle a more focused reading experience | On / Off |
| **Font Size** | Article body font size | Small, Medium, Large, XL |
| **Line Height** | Article body line height | Compact, Comfortable, Relaxed |
| **Content Width** | Article content area width | Narrow, Medium, Wide |
| **Reading Theme** | Article reading theme | Default, Eye Care, Parchment, Night, OLED |
| **Font Family** | Article body font | Serif, Sans, Mono, System, Code, LXGW, ZCOOL, Readable, Classic |
| **Focus Mode** | Highlight the current reading paragraph | On / Off |

### Layout Settings

| Option | Description | Values |
|--------|-------------|--------|
| **Posts Layout** | Homepage post list display mode | Card (title-first), Grid (3-column browse), List (compact archive) |

### General Settings

| Option | Description |
|--------|-------------|
| **Sticky Back to Top** | Show/hide the sticky in-article back-to-top button |
| **Back to Top** | Show/hide back to top button |
| **Theme Toggle** | Show/hide theme toggle button |
| **Reading Time** | Show/hide article reading time |
| **Animations** | Enable/disable page animations |
| **Card Hover** | Enable/disable card hover effects |
| **Smooth Scroll** | Enable/disable smooth scrolling |

### AI chat panel size

When AI chat is enabled, you can resize the chat panel:

| Option | Description |
|--------|-------------|
| **Small (S)** | Compact width, good for browsing alongside the page |
| **Medium (M)** | Default balanced size |
| **Large (L)** | Wider panel for long replies and code |

Your choice is persisted in `localStorage` and restored on your next visit.

## Sharing Settings

You can share your current settings with others:

1. Click the "Share" button at the bottom of the settings panel
2. Your current preferences are encoded and copied to the clipboard for link sharing
3. Others will automatically apply your settings when opening the link

### Technical Implementation

Settings are encoded as Base64 JSON in the URL hash: `#prefs=<base64-encoded-json>`. When someone opens a shared URL, preferences are automatically decoded and applied.

## Resetting Settings

Click the "Reset" button at the bottom of the settings panel to restore all settings to their default values.

## Settings Persistence

All settings are automatically saved to the browser's local storage and will be restored on your next visit.

## Technical Details

The preferences system is located in `packages/core/src/preferences/`:

- `types.ts` - Type definitions
- `defaults.ts` - Default values
- `presets.ts` - Theme presets
- `storage.ts` - Storage management
- `share.ts` - Share functionality
