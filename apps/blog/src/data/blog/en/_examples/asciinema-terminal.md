---
title: "Asciinema Terminal Replay"
pubDatetime: 2026-03-12T00:00:00.000Z
author: Souloss
description: "Embed terminal session recordings in your blog posts using the AsciinemaPlayer component."
tags:
  - tutorial
  - examples
  - visualization
category: Examples
draft: false
---

[asciinema](https://asciinema.org/) is a terminal session recording and playback tool. With the `:::asciinema` directive, you can embed recorded terminal sessions directly in your blog posts.

---

## Basic Example

Here's a simple terminal session demo:

:::asciinema{src="/casts/demo.cast" rows="18"}
:::

## Usage

Use the `:::asciinema` directive in Markdown files:

```markdown
:::asciinema{src="/casts/demo.cast"}
```

## Recording .cast Files

Use the `asciinema` CLI to record terminal sessions:

```bash
# Install
brew install asciinema    # macOS
sudo apt install asciinema # Ubuntu

# Record
asciinema rec demo.cast

# Record a specific command
asciinema rec -c "pnpm run build" build-demo.cast

# Set idle time compression
asciinema rec -i 2 demo.cast
```

Press `Ctrl+D` or type `exit` to stop recording. Place the generated `.cast` file in `public/casts/` to reference it.

## Auto Play

Set `autoPlay` to start playback automatically:

:::asciinema{src="/casts/demo.cast" autoPlay="true" speed="2" rows="18"}
:::

## Directive Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `src` | `string` | required | Path to `.cast` file |
| `cols` | `string` | `80` | Terminal columns |
| `rows` | `string` | `24` | Terminal rows |
| `speed` | `string` | `1` | Playback speed multiplier |
| `idleTimeLimit` | `string` | `2` | Idle time compression threshold (seconds) |
| `fit` | `string` | `"width"` | Fit mode |
| `autoPlay` | `string` | `false` | Auto-start playback |
| `loop` | `string` | `false` | Loop playback |

The player automatically follows the blog's light/dark theme.
