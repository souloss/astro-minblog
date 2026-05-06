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

### Method 1: Markdown Directive (Recommended)

Use the `:::excalidraw` directive directly in any Markdown file:

```markdown
:::excalidraw{src="https://excalidraw.com/#json=..." height="500px"}
```

This directive handles responsive sizing, dark mode, and loading states automatically. No imports needed — works in both `.md` and `.mdx` files.

### Method 2: iframe Embed (Fallback)

For cases where the directive is unavailable, use an HTML iframe directly:

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

## Using the Excalidraw Directive

The `:::excalidraw` directive provides the richest integration. Here's the full API:

```markdown
:::excalidraw{src="https://excalidraw.com/#json=..." height="500px"}
```

### Directive Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `src` | `string` | required | Excalidraw scene URL |
| `height` | `string` | `"400px"` | Height of the embed container |

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

## Live Demo

Here's an embedded Excalidraw whiteboard using the directive:

:::excalidraw{src="https://excalidraw.com/" height="500px"}
:::

> [!TIP]
> The directive automatically handles lazy loading and responsive sizing. No need to manually add `loading="lazy"` or `width` attributes.

---

## Creating Shareable Scenes

### Step-by-Step Guide

1. **Open Excalidraw** — Navigate to [excalidraw.com](https://excalidraw.com)
2. **Draw your diagram** — Use the toolbar to add shapes, arrows, text
3. **Export as link** — Click the share icon and choose "Shareable link"
4. **Copy the URL** — The scene data is encoded in the URL hash
5. **Paste into your post** — Use the `:::excalidraw` directive with the scene URL

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
- [Mermaid Diagrams](/en/posts/mermaid-diagrams) — For formal flowcharts and sequence diagrams
- [Markmap Mindmaps](/en/posts/markmap-mindmaps) — For hierarchical concept visualization
