---
author: Souloss
pubDatetime: 2026-03-22T00:00:00.000Z
title: astro-minimax 0.9.0
featured: false
category: Release Notes
tags:
  - release
cover: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=630&fit=crop"
description: "astro-minimax 0.9.0: Mermaid interactive toolbar, enhanced comments component, improved UI styling and accessibility, user preferences optimization, and more."
---

astro-minimax 0.9.0 is a feature enhancement release with multiple user experience improvements and component enhancements.

## New Features

### Mermaid Interactive Toolbar

Enhanced the MermaidInit component with a new interactive toolbar:

- **Zoom Controls**: Zoom in, zoom out, reset zoom
- **Export Options**: Export to SVG and PNG formats
- **Fullscreen Mode**: View diagrams in fullscreen
- **Theme Switch**: Quickly switch themes within the diagram
- **Improved Rendering**: Optimized rendering performance and visual effects

### Enhanced Comments Component

Optimized the Comments component for better functionality and user experience:

- **Loading Timeout**: New loading timeout mechanism to prevent indefinite waiting
- **Error Handling**: Comprehensive error handling with friendly error messages
- **Retry Mechanism**: Retry option available when loading fails
- **Status Feedback**: Clear loading states and progress indicators

### UI Component Improvements

Enhanced styling and accessibility across multiple UI components:

- **Improved Button Styles**: Clearer interaction feedback
- **Enhanced Accessibility**: Better keyboard navigation and screen reader support
- **Optimized Animations**: Smoother transition animations
- **Unified Design Language**: Consistent colors and spacing

## Improvements

### User Preferences

Enhanced the user preferences system:

- **Default Configuration**: Sensible default configurations provided
- **Settings Integration**: Better integration with settings panel
- **Storage Optimization**: Optimized storage and retrieval of preferences

### Documentation Enhancements

- **AI Guide Update**: Updated AI functionality guide with new features and configuration details
- **CLI Documentation**: Improved CLI tool documentation with usage examples

### OG Image Generation

- **Tool Update**: Updated OG image generation tool
- **Screenshot Configuration**: Enhanced screenshot-related configuration options

## Fixes

- **Clipboard Copy Feedback**: Fixed button innerHTML update issue, providing clearer copy success feedback
- **Website URL Correction**: Fixed incorrect website URL in configuration

## Upgrade Guide

If you're using 0.8.3, simply update dependencies:

```bash
pnpm update @astro-minimax/core @astro-minimax/ai @astro-minimax/cli @astro-minimax/notify
```

## Acknowledgments

Thanks to all contributors and users who provided feedback!