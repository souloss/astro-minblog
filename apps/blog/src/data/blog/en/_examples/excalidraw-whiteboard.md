---
title: "Excalidraw Whiteboard: Hand-Drawn Diagrams in Your Blog"
pubDatetime: 2026-03-12T00:00:00.000Z
author: Souloss
description: "Learn how to integrate Excalidraw hand-drawn style whiteboards into your blog posts, including embedding methods, scene URLs, and best practices."
tags:
  - tutorial
  - examples
  - excalidraw
category: Examples
draft: false
---

Excalidraw is a virtual whiteboard tool that produces hand-drawn style diagrams. It's perfect for technical illustrations, architecture diagrams, and visual explanations that feel approachable and informal.

---

## Table of Contents

- [What is Excalidraw?](#what-is-excalidraw)
- [Integration Methods](#integration-methods)
- [Using the ExcalidrawEmbed Component (MDX)](#using-the-excalidrawembed-component-mdx)
- [Embedding via iframe (Markdown)](#embedding-via-iframe-markdown)
- [Creating Shareable Scenes](#creating-shareable-scenes)
- [Example Scenes](#example-scenes)
- [Tips and Best Practices](#tips-and-best-practices)

---

## What is Excalidraw?

[Excalidraw](https://excalidraw.com) is an open-source virtual whiteboard with these key features:

- **Hand-drawn aesthetic** — Diagrams look sketched, making them feel informal and approachable
- **Real-time collaboration** — Multiple people can draw on the same canvas
- **Export options** — PNG, SVG, or shareable URLs
- **Rich element library** — Shapes, arrows, text, and community libraries
- **Dark mode support** — Adapts to your preferred theme
- **End-to-end encrypted** — Shared scenes are private by default

It's widely used in technical blogs, documentation, and architecture design.

---

## Integration Methods

There are two ways to embed Excalidraw in this blog:

### Method 1: ExcalidrawEmbed Component (MDX files)

If your post is an `.mdx` file, you can use the custom `<ExcalidrawEmbed>` component:

```astro
---
import ExcalidrawEmbed from '@/components/media/ExcalidrawEmbed.astro';
---

<ExcalidrawEmbed
  url="https://excalidraw.com/#json=..."
  title="Architecture Diagram"
  height="500px"
/>
```

This component handles responsive sizing, dark mode, and loading states automatically.

### Method 2: iframe Embed (Markdown files)

For standard `.md` files, use an HTML iframe directly:

```html
<iframe
  src="https://excalidraw.com/#json=YOUR_SCENE_DATA"
  width="100%"
  height="500"
  style="border: none; border-radius: 8px;"
  title="Excalidraw Diagram"
></iframe>
```

---

## Using the ExcalidrawEmbed Component (MDX)

The `ExcalidrawEmbed` component provides the richest integration. Here's the full API:

```astro
<ExcalidrawEmbed
  url="https://excalidraw.com/#json=..."
  title="My Diagram"
  height="500px"
  darkMode={true}
/>
```

### Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `url` | `string` | required | Excalidraw scene URL |
| `title` | `string` | `"Excalidraw"` | Accessible title for the iframe |
| `height` | `string` | `"400px"` | Height of the embed container |
| `darkMode` | `boolean` | `auto` | Force light/dark mode |

### How to Get a Scene URL

1. Go to [excalidraw.com](https://excalidraw.com)
2. Create your diagram
3. Click the **Share** button (or use <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>E</kbd>)
4. Select **Shareable link**
5. Copy the URL — it contains the full scene data encoded in the hash fragment

The URL format looks like:

```
https://excalidraw.com/#json=eyJlbGVtZW50cyI6W...
```

---

## Embedding via iframe (Markdown)

Since this is a `.md` file, here's how to embed Excalidraw directly using HTML:

<div style="border: 2px dashed #666; border-radius: 12px; padding: 2rem; text-align: center; margin: 1.5rem 0; background: #f9fafb;">
  <p style="font-size: 1.1rem; margin-bottom: 0.5rem;"><strong>Excalidraw Embed Placeholder</strong></p>
  <p style="color: #666;">To see a live Excalidraw whiteboard here, create a scene at <a href="https://excalidraw.com" target="_blank">excalidraw.com</a> and replace this with an iframe using the shareable link.</p>
</div>

Here's the embed code pattern:

```html
<iframe
  src="https://excalidraw.com/"
  width="100%"
  height="500"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
  title="Excalidraw Whiteboard"
  loading="lazy"
></iframe>
```

> [!TIP]
> Add `loading="lazy"` to defer loading the iframe until it enters the viewport. This improves page load performance, especially when you have multiple embeds.

---

## Creating Shareable Scenes

### Step-by-Step Guide

1. **Open Excalidraw** — Navigate to [excalidraw.com](https://excalidraw.com)
2. **Draw your diagram** — Use the toolbar to add shapes, arrows, text
3. **Export as link** — Click the share icon and choose "Shareable link"
4. **Copy the URL** — The scene data is encoded in the URL hash
5. **Paste into your post** — Use either the component or iframe method

### Scene Data Format

Excalidraw encodes scene data as JSON in the URL hash. A minimal scene looks like:

```json
{
  "type": "excalidraw",
  "version": 2,
  "elements": [
    {
      "type": "rectangle",
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 100,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#a5d8ff",
      "fillStyle": "hachure",
      "roughness": 1
    },
    {
      "type": "text",
      "x": 140,
      "y": 135,
      "text": "Hello!",
      "fontSize": 24,
      "fontFamily": 1
    }
  ],
  "appState": {
    "viewBackgroundColor": "#ffffff"
  }
}
```

This JSON is then Base64-encoded and appended to the URL as a hash fragment.

---

## Example Scenes

### Scene 1: Simple Architecture Diagram

A typical web application architecture with client, server, and database layers:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser    │────▶│   Server    │────▶│  Database   │
│  (React/Vue) │◀────│  (Node.js)  │◀────│ (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │
       ▼                    ▼
┌─────────────┐     ┌─────────────┐
│    CDN      │     │    Cache    │
│ (Cloudflare)│     │   (Redis)   │
└─────────────┘     └─────────────┘
```

> In Excalidraw, this would be drawn with hand-sketched rectangles and arrows, giving it a friendly whiteboard feel.

### Scene 2: Data Flow Diagram

```
User Input ──▶ Validation ──▶ Processing ──▶ Storage
     │              │              │            │
     ▼              ▼              ▼            ▼
  UI Form      Schema Check   Transform     Database
                   │              │
                   ▼              ▼
               Error Msg     Event Queue ──▶ Notifications
```

### Scene 3: Component Hierarchy

```
           App
          / | \
     Header Main Footer
       |     |      |
     Nav   Content  Links
    / | \    |
  Logo Menu Search
           / | \
      Posts Tags Categories
```

These ASCII representations show the kind of diagrams you'd create in Excalidraw. The hand-drawn style makes them perfect for blog posts where you want to explain concepts without the rigidity of formal UML diagrams.

---

## Tips and Best Practices

### Design Tips

- **Keep it simple** — Excalidraw's charm is in its simplicity. Don't overcrowd the canvas.
- **Use color sparingly** — Stick to 2-3 colors for clarity. Use fills to highlight key elements.
- **Add labels** — Every shape and arrow should have clear labels.
- **Maintain alignment** — Use Excalidraw's grid snap for consistent spacing.

### Performance Tips

- **Use lazy loading** — Add `loading="lazy"` to iframes for better page performance
- **Set explicit dimensions** — Always specify width and height to prevent layout shifts
- **Consider screenshots** — For static diagrams, an exported PNG may load faster than an iframe

### Accessibility Tips

- **Always add a title** — The `title` attribute on iframes is read by screen readers
- **Provide alt text** — If using exported images, include descriptive alt text
- **Include text descriptions** — Add a brief text summary below complex diagrams for accessibility

> [!NOTE]
> Excalidraw scenes shared via URL are end-to-end encrypted. Only people with the exact link can view the content. The server never sees the unencrypted scene data.

---

## Further Reading

- [Excalidraw Official Site](https://excalidraw.com)
- [Excalidraw GitHub Repository](https://github.com/excalidraw/excalidraw)
- [Excalidraw Libraries](https://libraries.excalidraw.com) — Community-created element libraries
- [Mermaid Diagrams](/en/blog/_examples/mermaid-diagrams) — For formal flowcharts and sequence diagrams
- [Markmap Mindmaps](/en/blog/_examples/markmap-mindmaps) — For hierarchical concept visualization
