---
title: "Markdown Basics: A Complete Syntax Guide"
pubDatetime: 2026-03-12T00:00:00.000Z
author: Souloss
description: "A comprehensive guide to basic Markdown syntax including headings, text formatting, lists, links, images, blockquotes, tables, task lists, footnotes, and more."
tags:
  - tutorial
  - examples
  - markdown
category: Examples
draft: false
---

This article covers all the fundamental Markdown syntax you need to write rich, well-structured content. Every feature includes a working example so you can see exactly how it renders.

---

## Table of Contents

- [Headings](#headings)
- [Text Formatting](#text-formatting)
- [Lists](#lists)
- [Links and Images](#links-and-images)
- [Blockquotes](#blockquotes)
- [Horizontal Rules](#horizontal-rules)
- [Tables](#tables)
- [Task Lists](#task-lists)
- [Footnotes](#footnotes)
- [Emoji Support](#emoji-support)

---

## Headings

Markdown supports six levels of headings. Use `#` symbols to define the heading level.

# Heading Level 1

## Heading Level 2

### Heading Level 3

#### Heading Level 4

##### Heading Level 5

###### Heading Level 6

Each heading creates an anchor link automatically, which is how the Table of Contents above works. For accessibility, avoid skipping heading levels — go from `h2` to `h3`, not from `h2` to `h5`.

---

## Text Formatting

Markdown provides several inline formatting options:

| Syntax | Result |
|---|---|
| `**bold text**` | **bold text** |
| `*italic text*` | *italic text* |
| `~~strikethrough~~` | ~~strikethrough~~ |
| `**_bold and italic_**` | **_bold and italic_** |
| `` `inline code` `` | `inline code` |
| `<mark>highlighted</mark>` | <mark>highlighted</mark> |
| `<sup>superscript</sup>` | x<sup>2</sup> |
| `<sub>subscript</sub>` | H<sub>2</sub>O |

You can combine these freely:

- **This is _bold and italic_ mixed** in a sentence.
- This text has ~~a deleted part~~ and a **replacement**.
- Use `inline code` inside **bold context**: **the `config.ts` file**.

---

## Lists

### Unordered Lists

Use `-`, `*`, or `+` to create unordered lists:

- First item
- Second item
- Third item
  - Nested item A
  - Nested item B
    - Deeply nested item
    - Another deeply nested item
  - Nested item C
- Fourth item

### Ordered Lists

Use numbers followed by a period:

1. First step
2. Second step
3. Third step
   1. Sub-step 3a
   2. Sub-step 3b
      1. Sub-sub-step
      2. Another sub-sub-step
   3. Sub-step 3c
4. Fourth step

### Mixed Lists

You can nest ordered lists inside unordered lists and vice versa:

- Project setup
  1. Initialize repository
  2. Install dependencies
  3. Configure environment
- Development
  1. Create components
  2. Write tests
  3. Review code
- Deployment
  1. Build project
  2. Run tests
  3. Deploy to production

### List with Paragraphs

List items can contain multiple paragraphs by indenting:

1. First item with a long description.

   This is a continuation paragraph under the first item. Notice the blank line and indentation.

2. Second item.

   Another paragraph here. Lists can contain any block-level content when properly indented.

---

## Links and Images

### Inline Links

[Visit Astro's official site](https://astro.build) to learn more about the framework.

You can also add a title attribute: [Astro Documentation](https://docs.astro.build "Astro Docs - Build faster websites").

### Reference-Style Links

For cleaner text, use reference-style links:

Read the [Astro guide][astro-guide] or check the [Tailwind docs][tw-docs] for styling.

[astro-guide]: https://docs.astro.build/en/getting-started/
[tw-docs]: https://tailwindcss.com/docs

### Auto-linked URLs

Simply paste a URL and it becomes clickable: https://github.com

### Images

Standard image syntax:

![A serene mountain landscape](https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800)

Image with title text:

![Code on a screen](https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800 "A developer's workspace")

### Linked Images

[![Astro Logo](https://astro.build/assets/press/astro-icon-light.png)](https://astro.build)

---

## Blockquotes

### Simple Blockquote

> Markdown is a lightweight markup language with plain text formatting syntax.
> It was created by John Gruber in 2004.

### Multi-Paragraph Blockquote

> The first paragraph of the quote.
>
> The second paragraph of the quote. Use a `>` on the blank line between paragraphs to keep them in the same blockquote.

### Nested Blockquotes

> This is the outer blockquote.
>
> > This is a nested blockquote. It goes one level deeper.
> >
> > > And this is nested even further — three levels deep!
>
> Back to the first level.

### Blockquote with Other Elements

> #### Blockquote with a Heading
>
> - Item one
> - Item two
>
> The quote can contain **bold**, *italic*, and `code` formatting, as well as lists and other Markdown elements.

---

## Horizontal Rules

You can create horizontal rules with three or more hyphens, asterisks, or underscores:

---

***

___

All three render identically. Use them to visually separate sections of content.

---

## Tables

### Simple Table

| Name | Role | Location |
|------|------|----------|
| Alice | Frontend Developer | Tokyo |
| Bob | Backend Developer | Berlin |
| Carol | DevOps Engineer | New York |

### Aligned Table

Use colons to align columns:

| Left Aligned | Center Aligned | Right Aligned |
|:-------------|:--------------:|--------------:|
| Content | Content | Content |
| More | More | More |
| Text | Text | Text |

### Complex Table

| Feature | Free Plan | Pro Plan | Enterprise |
|:--------|:---------:|:--------:|:----------:|
| Users | 1 | 10 | Unlimited |
| Storage | 1 GB | 100 GB | 1 TB |
| API Calls | 1,000/mo | 100,000/mo | Unlimited |
| Support | Community | Email | 24/7 Phone |
| SSO | ❌ | ❌ | ✅ |
| Custom Domain | ❌ | ✅ | ✅ |
| Analytics | Basic | Advanced | Advanced |

### Table with Formatting

| Method | Description | Example |
|--------|-------------|---------|
| `GET` | Retrieve a resource | `fetch('/api/users')` |
| `POST` | Create a new resource | `fetch('/api/users', { method: 'POST' })` |
| `PUT` | Update a resource | `fetch('/api/users/1', { method: 'PUT' })` |
| `DELETE` | Remove a resource | `fetch('/api/users/1', { method: 'DELETE' })` |

---

## Task Lists

Task lists (checkboxes) are great for tracking progress:

- [x] Set up Astro project
- [x] Configure Tailwind CSS
- [x] Create blog layout
- [ ] Add search functionality
- [ ] Implement dark mode toggle
- [ ] Write documentation

### Nested Task Lists

- [x] Phase 1: Foundation
  - [x] Project scaffolding
  - [x] Design system setup
  - [x] Base components
- [ ] Phase 2: Features
  - [x] Blog post rendering
  - [ ] Tag filtering
  - [ ] Pagination
- [ ] Phase 3: Polish
  - [ ] Performance optimization
  - [ ] Accessibility audit
  - [ ] Cross-browser testing

---

## Footnotes

Footnotes let you add references without cluttering the text.

Markdown was created by John Gruber[^1] and Aaron Swartz[^2] in 2004. It has since become one of the most popular markup languages for writing content on the web[^3].

The original Markdown specification[^1] was intentionally minimal. Many extended syntaxes like GitHub Flavored Markdown (GFM)[^4] have expanded on the original.

[^1]: John Gruber is a technology blogger and the creator of the Daring Fireball blog.
[^2]: Aaron Swartz was a programmer, writer, and internet activist who contributed to the Markdown specification.
[^3]: According to various developer surveys, Markdown is the most commonly used documentation format.
[^4]: GitHub Flavored Markdown (GFM) adds tables, task lists, strikethrough, and autolinks to the original spec.

---

## Emoji Support

You can use emoji shortcodes in your Markdown:

- :rocket: Launch day!
- :star: Featured content
- :book: Documentation
- :bulb: Tip of the day
- :warning: Important notice
- :heavy_check_mark: Task completed
- :x: Failed test
- :heart: Community love
- :tada: Celebration
- :construction: Work in progress

### Emoji in Context

> :bulb: **Tip:** Use emoji sparingly in technical writing. They work great for status indicators and casual blog posts.

Here's a quick project status:

| Task | Status |
|------|--------|
| Backend API | :heavy_check_mark: Complete |
| Frontend UI | :construction: In Progress |
| Documentation | :book: Drafting |
| Testing | :x: Not Started |
| Deployment | :rocket: Ready |

---

## Wrapping Up

This article covered the core Markdown syntax you'll use daily. Markdown's simplicity is its strength — a few symbols transform plain text into rich, structured documents. For more advanced features like math formulas, code highlighting, and alerts, see the [Markdown Extended Features](/en/blog/_examples/markdown-extended) article.
