import bx from '@iconify-json/bx/icons.json' with { type: 'json' };
import lucide from '@iconify-json/lucide/icons.json' with { type: 'json' };
import solar from '@iconify-json/solar/icons.json' with { type: 'json' };
import crypto from 'node:crypto';
import { visit } from 'unist-util-visit';

// ── Types ──────────────────────────────────────────────────────────────────

export interface RemarkContentDirectivesOptions {
  links?: Record<
    string,
    Array<{
      url: string;
      title: string;
      description?: string;
      cover?: string;
      icon?: string;
      labels?: Array<{ name: string; color?: string }>;
    }>
  >;
  screenshotService?: 'thumio' | 'mshots';
}

interface IconData {
  body: string;
  width?: number;
  height?: number;
}

interface IconSet {
  icons?: Record<string, IconData>;
}

interface HslResult {
  h: number;
  s: number;
  l: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const ICON_SETS: Record<string, IconSet> = { lucide, bx, solar };
const SET_ALIASES: Record<string, string> = { bxs: 'bx', bxl: 'bx' };
const SET_PREFIXES: Record<string, string> = { bxs: 'bxs-', bxl: 'bxl-' };

const EMOJI_SOURCES: Record<string, string> = {
  default: 'https://gcore.jsdelivr.net/gh/cdn-x/emoticons@3.1/qq/{name}.gif',
  qq: 'https://gcore.jsdelivr.net/gh/cdn-x/emoticons@3.1/qq/{name}.gif',
  aru: 'https://gcore.jsdelivr.net/gh/cdn-x/emoticons@3.1/aru/{name}.gif',
  tieba: 'https://gcore.jsdelivr.net/gh/cdn-x/emoticons@3.1/tieba/{name}.png',
  blobcat: 'https://gcore.jsdelivr.net/gh/cdn-x/emoticons@3.1/blobcat/{name}.gif',
  twemoji: 'https://gcore.jsdelivr.net/gh/twitter/twemoji/assets/svg/{name}.svg',
};

const HASHTAG_COLORS: string[] = [
  'red',
  'orange',
  'yellow',
  'green',
  'cyan',
  'blue',
  'purple',
];
let hashtagIndex = 0;

const NAMED_COLORS: Record<string, string> = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
  pink: '#ec4899',
  cyan: '#06b6d4',
  accent: 'var(--accent-color,#4a7c59)',
};

// ── Helper Functions ───────────────────────────────────────────────────────

function getIconSvg(name: string, size: string = '1em'): string {
  const [rawSet, iconName] = name.split(':');
  const set = SET_ALIASES[rawSet] || rawSet;
  const prefixedName = (SET_PREFIXES[rawSet] || '') + iconName;
  const data =
    ICON_SETS[set]?.icons?.[prefixedName] || ICON_SETS[set]?.icons?.[iconName];
  if (!data) return '';
  const { body, width = 24, height = 24 } = data;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${width} ${height}" fill="currentColor">${body}</svg>`;
}

function resolveColor(c: string | undefined): string {
  if (!c) return 'var(--accent-color,#4a7c59)';
  return NAMED_COLORS[c] || c;
}

function h(
  tagName: string,
  properties: Record<string, unknown>,
  children: any[]
): any {
  return {
    type: 'container',
    data: { hName: tagName, hProperties: properties || {} },
    children: children || [],
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function serializeToHtml(nodes: any | any[]): string {
  if (!Array.isArray(nodes)) nodes = [nodes];
  return nodes
    .map((node: any) => {
      if (!node) return '';
      switch (node.type) {
        case 'text':
          return escapeHtml(node.value || '');
        case 'inlineCode':
          return `<code>${escapeHtml(node.value || '')}</code>`;
        case 'strong':
          return `<strong>${serializeToHtml(node.children)}</strong>`;
        case 'emphasis':
          return `<em>${serializeToHtml(node.children)}</em>`;
        case 'delete':
          return `<del>${serializeToHtml(node.children)}</del>`;
        case 'link':
          return `<a href="${node.url || '#'}">${serializeToHtml(node.children)}</a>`;
        case 'image':
          return `<img src="${node.url || ''}" alt="${node.alt || ''}" loading="lazy" />`;
        case 'break':
          return '<br>';
        case 'paragraph':
          return `<p>${serializeToHtml(node.children)}</p>`;
        case 'heading':
          return `<h${node.depth || 2}>${serializeToHtml(node.children)}</h${node.depth || 2}>`;
        case 'code':
          return `<pre><code class="language-${node.lang || ''}">${escapeHtml(node.value || '')}</code></pre>`;
        case 'blockquote':
          return `<blockquote>${serializeToHtml(node.children)}</blockquote>`;
        case 'list': {
          const tag = node.ordered ? 'ol' : 'ul';
          return `<${tag}>${node.children.map((item: any) => `<li>${serializeToHtml(item.children)}</li>`).join('')}</${tag}>`;
        }
        case 'listItem':
          return serializeToHtml(node.children);
        case 'thematicBreak':
          return '<hr>';
        case 'html':
          return node.value || '';
        case 'container':
          return serializeToHtml(node.children);
        default:
          return '';
      }
    })
    .join('');
}

function encryptPrivateContent(text: string, password: string): string {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const payload = Buffer.concat([salt, iv, Buffer.from(encrypted, 'base64')]);
  return payload.toString('base64');
}

function hexToHsl(hex: string): HslResult {
  let r = 0,
    g = 0,
    b = 0;
  if (hex.length === 4) {
    r = parseInt('0x' + hex[1] + hex[1]);
    g = parseInt('0x' + hex[2] + hex[2]);
    b = parseInt('0x' + hex[3] + hex[3]);
  } else if (hex.length === 7) {
    r = parseInt('0x' + hex[1] + hex[2]);
    g = parseInt('0x' + hex[3] + hex[4]);
    b = parseInt('0x' + hex[5] + hex[6]);
  }
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let hue = 0,
    s = 0,
    l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        hue = ((b - r) / d + 2) / 6;
        break;
      case b:
        hue = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return {
    h: Math.round(hue * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function labelTextColor(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  if (l > 75) {
    return `hsla(${h}, ${s}%, 20%, 1)`;
  } else if (s > 90 && l > 40) {
    return `hsla(${h}, 50%, 20%, 1)`;
  }
  return 'white';
}

function getScreenshotUrl(
  url: string,
  service: 'thumio' | 'mshots' = 'thumio'
): string {
  if (service === 'mshots') {
    return `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=1280&h=720`;
  }
  return `https://image.thum.io/get/width/1280/crop/720/${url}`;
}

// ── Plugin ─────────────────────────────────────────────────────────────────

export function remarkContentDirectives(
  options: RemarkContentDirectivesOptions = {}
): (tree: any) => void {
  const { links, screenshotService } = options;

  return (tree: any) => {
    // ── Text Directives ──────────────────────────────────────────────────

    visit(tree, 'textDirective', (node: any) => {
      const name = node.name;
      const attrs = node.attributes || {};
      const text =
        node.children?.map((c: any) => c.value || '').join('') || '';

      if (name === 'mark') {
        const bg = resolveColor(attrs.color || 'yellow');
        const bgAlpha = bg.startsWith('var(')
          ? `color-mix(in srgb,${bg} 30%,transparent)`
          : bg + '55';
        node.data = {
          hName: 'mark',
          hProperties: {
            class: 'md-tag-mark',
            style: `--tag-mark-bg:${bgAlpha};--tag-mark-color:${bg}`,
          },
        };
      } else if (name === 'kbd') {
        node.data = { hName: 'kbd', hProperties: { class: 'md-tag-kbd' } };
      } else if (name === 'blur') {
        node.data = {
          hName: 'span',
          hProperties: {
            class: 'md-tag-blur',
            onclick: "this.classList.toggle('md-tag-blur--revealed')",
          },
        };
      } else if (name === 'psw') {
        node.data = {
          hName: 'span',
          hProperties: {
            class: 'md-tag-psw',
            onclick: "this.classList.toggle('md-tag-psw--revealed')",
          },
        };
      } else if (name === 'u') {
        node.data = {
          hName: 'u',
          hProperties: {
            class: 'md-tag-u',
            style: `--tag-u-color:${resolveColor(attrs.color || 'accent')}`,
          },
        };
      } else if (name === 'emp') {
        node.data = {
          hName: 'span',
          hProperties: {
            class: 'md-tag-emp',
            style: `--tag-emp-color:${resolveColor(attrs.color || 'accent')}`,
          },
        };
      } else if (name === 'wavy') {
        node.data = {
          hName: 'span',
          hProperties: {
            class: 'md-tag-wavy',
            style: `--tag-wavy-color:${resolveColor(attrs.color || 'accent')}`,
          },
        };
      } else if (name === 'del') {
        node.data = {
          hName: 'del',
          hProperties: { class: 'md-tag-del' },
        };
      } else if (name === 'sup') {
        node.data = {
          hName: 'sup',
          hProperties: {
            class: 'md-tag-sup',
            style: `--tag-sup-color:${resolveColor(attrs.color || 'accent')}`,
          },
        };
      } else if (name === 'sub') {
        node.data = {
          hName: 'sub',
          hProperties: {
            class: 'md-tag-sub',
            style: `--tag-sub-color:${resolveColor(attrs.color || 'accent')}`,
          },
        };
      } else if (name === 'hashtag') {
        let color = attrs.color ? resolveColor(attrs.color) : '';
        if (!color) {
          color = resolveColor(HASHTAG_COLORS[hashtagIndex]);
          hashtagIndex += 1;
          if (hashtagIndex >= HASHTAG_COLORS.length) hashtagIndex = 0;
        }
        const href = attrs.href || '#';
        const hashIcon =
          '<svg class="md-hash-svg" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path d="M426.6 64.8c34.8 5.8 58.4 38.8 52.6 73.6l-19.6 117.6h190.2l23-138.6c5.8-34.8 38.8-58.4 73.6-52.6s58.4 38.8 52.6 73.6l-19.4 117.6H896c35.4 0 64 28.6 64 64s-28.6 64-64 64h-137.8l-42.6 256H832c35.4 0 64 28.6 64 64s-28.6 64-64 64h-137.8l-23 138.6c-5.8 34.8-38.8 58.4-73.6 52.6s-58.4-38.8-52.6-73.6l19.6-117.4h-190.4l-23 138.6c-5.8 34.8-38.8 58.4-73.6 52.6s-58.4-38.8-52.6-73.6l19.4-117.8H128c-35.4 0-64-28.6-64-64s28.6-64 64-64h137.8l42.6-256H192c-35.4 0-64-28.6-64-64s28.6-64 64-64h137.8l23-138.6c5.8-34.8 38.8-58.4 73.6-52.6z m11.6 319.2l-42.6 256h190.2l42.6-256h-190.2z"/></svg>';
        node.data = {
          hName: 'a',
          hProperties: {
            href,
            class: 'md-tag-hashtag',
            style: `--tag-hash-color:${color}`,
          },
        };
        node.children = [
          { type: 'html', value: `<span class="md-hash-icon">${hashIcon}</span>` },
          { type: 'text', value: text },
        ];
      } else if (name === 'button') {
        const color = resolveColor(attrs.color || 'accent');
        const href = attrs.href || '#';
        const icon = attrs.icon || '';
        const size = attrs.size || '';
        const classes: string[] = ['md-tag-button'];
        if (size === 'xs') classes.push('md-btn-xs');
        node.data = {
          hName: 'a',
          hProperties: {
            href,
            class: classes.join(' '),
            style: `--tag-btn-bg:${color}`,
          },
        };
        const children: any[] = [];
        if (icon) {
          if (/^https?:\/\//i.test(icon)) {
            children.push({
              type: 'html',
              value: `<img class="md-btn-icon" src="${icon}" alt="" />`,
            });
          } else {
            const iconifyMatch = icon.match(/^([a-z0-9-]+):([a-z0-9-]+)$/i);
            if (iconifyMatch) {
              children.push({
                type: 'html',
                value: `<span class="md-btn-icon">${getIconSvg(icon, '1.2em')}</span>`,
              });
            } else {
              children.push({ type: 'text', value: icon });
            }
          }
        }
        children.push({ type: 'text', value: text });
        node.children = children;
      } else if (name === 'step-brackets') {
        const num =
          node.children?.map((c: any) => c.value || '').join('') || '';
        const title = attrs.title || '';
        node.data = { hName: 'div', hProperties: { class: 'md-step-brackets' } };
        node.children = [
          { type: 'html', value: `<span class="md-step-badge">${num}</span>` },
          ...(title
            ? [{ type: 'html', value: `<span class="md-step-title">${title}</span>` }]
            : []),
        ];
      } else if (name === 'checkbox') {
        const color = resolveColor(attrs.color || 'blue');
        const symbol = attrs.symbol || '';
        const checked = attrs.checked === 'true' || attrs.checked === '';
        const inline = attrs.inline === 'true' || attrs.inline === '';
        const classes: string[] = ['md-tag-checkbox'];
        if (symbol) classes.push(`md-checkbox-symbol-${symbol}`);
        if (inline) classes.push('md-checkbox-inline');
        node.data = {
          hName: inline ? 'span' : 'div',
          hProperties: {
            class: classes.join(' '),
            'data-checked': checked ? 'true' : 'false',
            style: `--checkbox-color:${color}`,
          },
        };
        node.children = [
          { type: 'html', value: '<span class="md-checkbox-box"></span>' },
          { type: 'text', value: text },
        ];
      } else if (name === 'radio') {
        const color = resolveColor(attrs.color || 'blue');
        const checked = attrs.checked === 'true' || attrs.checked === '';
        const inline = attrs.inline === 'true' || attrs.inline === '';
        const classes: string[] = ['md-tag-checkbox', 'md-tag-radio'];
        if (inline) classes.push('md-checkbox-inline');
        node.data = {
          hName: inline ? 'span' : 'div',
          hProperties: {
            class: classes.join(' '),
            'data-checked': checked ? 'true' : 'false',
            style: `--checkbox-color:${color}`,
          },
        };
        node.children = [
          { type: 'html', value: '<span class="md-checkbox-box"></span>' },
          { type: 'text', value: text },
        ];
      } else if (name === 'emoji') {
        const height = attrs.height || '1.75em';
        let source = attrs.source;
        let emojiName = attrs.name;

        if (source === undefined) {
          const firstSource = Object.keys(EMOJI_SOURCES)[0];
          if (firstSource) {
            emojiName =
              node.children?.map((c: any) => c.value || '').join('') || '';
            source = firstSource;
          }
        }

        if (!emojiName) {
          emojiName =
            node.children?.map((c: any) => c.value || '').join('') || '';
        }

        if (source && emojiName) {
          const template = EMOJI_SOURCES[source] || source;
          const url = template.replace('{name}', emojiName);
          node.data = {
            hName: 'span',
            hProperties: {
              class: 'md-tag-emoji',
              style: `--emoji-height:${height}`,
            },
          };
          node.children = [
            {
              type: 'html',
              value: `<img src="${url}" alt="${emojiName}" loading="lazy" style="height:${height}" />`,
            },
          ];
        }
      }
    });

    // ── Container Directives ─────────────────────────────────────────────

    visit(tree, 'containerDirective', (node: any) => {
      const name = node.name;
      const attrs = node.attributes || {};

      if (name === 'callout') {
        const type = attrs.type || 'info';
        const defaultTitles: Record<string, string> = {
          info: 'Info',
          tip: 'Tip',
          warn: 'Warning',
          danger: 'Danger',
        };
        const title = attrs.title || defaultTitles[type] || 'Info';
        const icons: Record<string, string> = {
          info: getIconSvg('lucide:info', '16'),
          tip: getIconSvg('lucide:lightbulb', '16'),
          warn: getIconSvg('lucide:triangle-alert', '16'),
          danger: getIconSvg('lucide:circle-x', '16'),
        };
        const colors: Record<
          string,
          { bar: string; bg: string; border: string }
        > = {
          info: {
            bar: '#3b82f6',
            bg: 'rgba(59,130,246,0.08)',
            border: 'rgba(59,130,246,0.22)',
          },
          tip: {
            bar: '#22c55e',
            bg: 'rgba(34,197,94,0.08)',
            border: 'rgba(34,197,94,0.22)',
          },
          warn: {
            bar: '#f59e0b',
            bg: 'rgba(245,158,11,0.08)',
            border: 'rgba(245,158,11,0.22)',
          },
          danger: {
            bar: '#ef4444',
            bg: 'rgba(239,68,68,0.08)',
            border: 'rgba(239,68,68,0.22)',
          },
        };
        const c = colors[type] || colors.info;
        node.data = {
          hName: 'div',
          hProperties: {
            class: `md-directive md-directive-callout md-callout-${type}`,
          },
        };
        node.children = [
          {
            type: 'html',
            value: `<div style="--callout-bar:${c.bar};--callout-bg:${c.bg};--callout-border:${c.border}"><div class="md-callout-inner"><div class="md-callout-title">${icons[type]}<span>${title}</span></div><div class="md-callout-body">`,
          },
          ...node.children,
          { type: 'html', value: '</div></div></div>' },
        ];
      } else if (name === 'note') {
        const title = attrs.title || '';
        const color = resolveColor(attrs.color || 'accent');
        node.data = {
          hName: 'div',
          hProperties: { class: 'md-directive md-directive-note' },
        };
        node.children = [
          {
            type: 'html',
            value: `<div style="--note-color:${color}">${title ? `<div class="md-note-title">${title}</div>` : ''}<div class="md-note-body">`,
          },
          ...node.children,
          { type: 'html', value: '</div></div>' },
        ];
      } else if (name === 'folding') {
        const title = attrs.title || 'Details';
        const open = attrs.open === 'true' || attrs.open === '';
        const color = resolveColor(attrs.color || 'accent');
        node.data = {
          hName: 'details',
          hProperties: {
            class: 'md-directive md-directive-folding',
            style: `--folding-color:${color}`,
            ...(open ? { open: true } : {}),
          },
        };
        node.children = [
          {
            type: 'html',
            value: `<summary><span class="md-folding-title">${title}</span><span class="md-folding-arrow">${getIconSvg('lucide:chevron-down', '12')}</span></summary><div class="md-folding-body">`,
          },
          ...node.children,
          { type: 'html', value: '</div>' },
        ];
      } else if (name === 'folders') {
        const folders: Array<{ title: string; children: any[] }> = [];
        let currentFolder: string | null = null;
        let currentContent: any[] = [];
        for (const child of node.children) {
          if (child.type === 'paragraph') {
            const text = child.children
              .map((c: any) => c.value || '')
              .join('')
              .trim();
            if (text.startsWith('folder:')) {
              if (currentFolder !== null)
                folders.push({ title: currentFolder, children: currentContent });
              currentFolder = text.slice(7).trim();
              currentContent = [];
              continue;
            }
          }
          if (currentFolder !== null) currentContent.push(child);
        }
        if (currentFolder !== null)
          folders.push({ title: currentFolder, children: currentContent });

        node.data = {
          hName: 'div',
          hProperties: { class: 'md-directive md-directive-folders' },
        };
        node.children = folders.map((f, i) => {
          const summaryHtml = `<summary><span class="md-folder-title">${f.title}</span><span class="md-folder-arrow">${getIconSvg('lucide:chevron-down', '12')}</span></summary>`;
          return h(
            'details',
            { class: 'md-folder', ...(i === 0 ? { open: true } : {}) },
            [
              { type: 'html', value: summaryHtml },
              h('div', { class: 'md-folder-body' }, f.children),
            ]
          );
        });
      } else if (name === 'timeline') {
        const items: Array<{ date: string; title: string; desc: string }> = [];
        visit(
          { type: 'root', children: node.children },
          'listItem',
          (listItem: any) => {
            let text = '';
            visit(listItem, 'text', (t: any) => {
              text += t.value;
            });
            const parts = text.split('|').map((s: string) => s.trim());
            if (parts.length >= 2)
              items.push({
                date: parts[0],
                title: parts[1],
                desc: parts[2] || '',
              });
          }
        );
        const html = `<ol class="md-directive md-directive-timeline">${items.map((item, i) => `<li class="md-timeline-node"><div class="md-timeline-dot${i === 0 ? ' md-timeline-dot-first' : ''}"></div><div class="md-timeline-content"><time>${item.date}</time><h3>${item.title}</h3>${item.desc ? `<p>${item.desc}</p>` : ''}</div></li>`).join('')}</ol>`;
        node.data = { hName: 'div', hProperties: {} };
        node.children = [{ type: 'html', value: html }];
      } else if (name === 'tabs') {
        const align = attrs.align || '';
        const tabs: Array<{
          label: string;
          color: string;
          children: any[];
        }> = [];
        let currentTab: string | null = null;
        let currentTabColor = '';
        let currentContent: any[] = [];
        for (const child of node.children) {
          if (child.type === 'paragraph') {
            const text = child.children
              .map((c: any) => c.value || '')
              .join('')
              .trim();
            if (text.startsWith('tab:')) {
              if (currentTab !== null)
                tabs.push({
                  label: currentTab,
                  color: currentTabColor,
                  children: currentContent,
                });
              const raw = text.slice(4).trim();
              const m = raw.match(/^(.+?)\{(color=[^}]+)\}$/);
              currentTab = m ? m[1].trim() : raw;
              currentTabColor = m
                ? resolveColor(
                    m[2]
                      .slice(6)
                      .trim()
                      .replace(/^['"""]+|['"""]+$/g, '')
                  )
                : '';
              currentContent = [];
              continue;
            }
          }
          if (currentTab !== null) currentContent.push(child);
        }
        if (currentTab !== null)
          tabs.push({
            label: currentTab,
            color: currentTabColor,
            children: currentContent,
          });

        const uid = `tabs-${Math.random().toString(36).slice(2, 7)}`;
        const navHtml = tabs
          .map((t, i) => {
            const isActive = i === 0 ? 'md-tab-active' : '';
            const colorStyle = t.color
              ? ` style="--tab-active-color:${t.color}"`
              : '';
            const href = `${uid}-pane-${i}`;
            return `<a href="#${href}" role="tab" aria-selected="${i === 0 ? 'true' : 'false'}" class="md-tab-btn ${isActive}"${colorStyle} data-tab-index="${i}" data-tabs-id="${uid}">${t.label}</a>`;
          })
          .join('');
        const paneEls = tabs.map((t, i) => {
          const isVisible = i === 0 ? 'md-tab-visible' : '';
          const href = `${uid}-pane-${i}`;
          return h(
            'div',
            {
              id: href,
              class: `md-tab-pane ${isVisible}`,
              role: 'tabpanel',
              'aria-labelledby': `${uid}-tab-${i}`,
            },
            t.children
          );
        });

        node.data = {
          hName: 'div',
          hProperties: {
            id: uid,
            class: 'md-directive md-directive-tabs',
            ...(align ? { align } : {}),
          },
        };
        node.children = [
          {
            type: 'html',
            value: `<div class="md-tabs-nav" role="tablist">${navHtml}</div><div class="md-tabs-content">`,
          },
          ...paneEls,
          { type: 'html', value: '</div>' },
        ];
      } else if (name === 'poetry') {
        const title = attrs.title || '';
        const author = attrs.author || '';
        const date = attrs.date || '';
        const footer = attrs.footer || '';
        node.data = { hName: 'div', hProperties: {} };
        node.children = [
          {
            type: 'html',
            value: `<div class="md-directive md-directive-poetry"><div class="md-poetry-content">${title ? `<div class="md-poetry-title">${title}</div>` : ''}${author || date ? `<div class="md-poetry-meta">${[author, date].filter(Boolean).join(' · ')}</div>` : ''}<div class="md-poetry-body">`,
          },
          ...node.children,
          {
            type: 'html',
            value: `</div>${footer ? `<div class="md-poetry-footer">${footer}</div>` : ''}</div></div>`,
          },
        ];
      } else if (name === 'copy') {
        const label = attrs.label || '';
        let text = '';
        visit({ type: 'root', children: node.children }, 'text', (t: any) => {
          text += t.value;
        });
        text = text.trim();
        const uid = `copy-${Math.random().toString(36).slice(2, 7)}`;
        const safeText = text
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        const copyIcon = getIconSvg('lucide:copy', '14');
        const html = `<div class="md-directive md-directive-copy" data-md-copy="1">${label ? `<span class="md-copy-label">${label}</span>` : ''}<input id="${uid}" readonly value="${safeText}" class="md-copy-input" style="width:${Math.max(text.length * 8, 120)}px"><button class="md-copy-btn" data-copy-target="${uid}">${copyIcon}</button></div>`;
        node.data = { hName: 'div', hProperties: {} };
        node.children = [{ type: 'html', value: html }];
      } else if (name === 'grid') {
        const cols = attrs.cols || '';
        const gap = attrs.gap || '16';
        const minw = attrs.minw || '240px';
        const bg = attrs.bg || 'card';
        const cells: any[][] = [];
        let currentCell: any[] = [];
        for (const child of node.children) {
          if (child.type === 'thematicBreak') {
            cells.push(currentCell);
            currentCell = [];
          } else {
            currentCell.push(child);
          }
        }
        if (currentCell.length) cells.push(currentCell);

        const gridClasses = ['md-directive-grid', `md-grid-bg-${bg}`];
        const gridStyle = `--grid-gap:${gap}px`;
        if (cols) {
          gridClasses.push('md-grid-cols');
          node.data = {
            hName: 'div',
            hProperties: {
              class: `md-directive ${gridClasses.join(' ')}`,
              style: `${gridStyle};--grid-cols:${cols}`,
            },
          };
        } else {
          gridClasses.push('md-grid-auto');
          node.data = {
            hName: 'div',
            hProperties: {
              class: `md-directive ${gridClasses.join(' ')}`,
              style: `${gridStyle};--grid-minw:${minw}`,
            },
          };
        }
        node.children = cells.map((c) => h('div', { class: 'md-grid-cell' }, c));
      } else if (name === 'blockquote') {
        const leftQuote = getIconSvg('bxs:quote-left', '28');
        const rightQuote = getIconSvg('bxs:quote-right', '28');
        node.data = {
          hName: 'blockquote',
          hProperties: { class: 'md-directive md-directive-blockquote' },
        };
        node.children = [
          {
            type: 'html',
            value: `<span class="md-blockquote-icon md-blockquote-icon-left">${leftQuote}</span>`,
          },
          ...node.children,
          {
            type: 'html',
            value: `<span class="md-blockquote-icon md-blockquote-icon-right">${rightQuote}</span>`,
          },
        ];
      } else if (name === 'quot') {
        const icon = attrs.icon || '';
        let text = '';
        visit({ type: 'root', children: node.children }, 'text', (t: any) => {
          text += t.value;
        });
        text = text.trim();
        const defaultIcon = getIconSvg('bxs:quote-left', '28');
        const html = `<div class="md-directive md-directive-quot">${icon ? `<span class="md-quot-icon">${icon}</span>` : `<span class="md-quot-icon-default">${defaultIcon}</span>`}<p class="md-quot-text">${text}</p></div>`;
        node.data = { hName: 'div', hProperties: {} };
        node.children = [{ type: 'html', value: html }];
      } else if (name === 'title') {
        const el = attrs.el || '';
        const level = Math.min(
          Math.max(
            parseInt(el.replace('h', ''), 10) ||
              parseInt(attrs.level, 10) ||
              2,
            2
          ),
          6
        );
        const centered =
          attrs.centered === 'true' ||
          attrs.centered === '' ||
          attrs.centered === true;
        const icon = attrs.icon || '';
        const showPrefix = attrs.prefix !== 'false';
        const suffixAttr = attrs.suffix || '';
        const style = attrs.style || 'quote';
        const shadow =
          attrs.shadow === 'true' ||
          attrs.shadow === '' ||
          attrs.shadow === true;
        const color = resolveColor(attrs.color || 'rgb(255, 87, 36)');

        function extractText(children: any[]): string {
          let result = '';
          for (const child of children || []) {
            if (child.type === 'text') result += child.value || '';
            else if (child.children) result += extractText(child.children);
          }
          return result;
        }

        function renderIcon(value: string): any {
          if (!value) return '';
          if (/^https?:\/\//i.test(value)) {
            return {
              type: 'html',
              value: `<img class="md-title-icon-img" src="${value}" alt="" />`,
            };
          }
          const iconifyMatch = value.match(/^([a-z0-9-]+):([a-z0-9-]+)$/i);
          if (iconifyMatch) {
            return {
              type: 'html',
              value: `<span class="md-title-icon-inline">${getIconSvg(value, '1em')}</span>`,
            };
          }
          return { type: 'text', value };
        }

        const text = extractText(node.children).trim();
        const slug = text
          ? text
              .replace(/\s+/g, '-')
              .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '')
              .toLowerCase()
          : '';
        const classes: string[] = ['md-title'];
        classes.push('md-directive');
        if (centered) classes.push('md-title-centered');
        if (style) classes.push(`md-title-style-${style}`);
        if (shadow) classes.push('md-title-shadow');
        const tag = `h${level}`;

        const hProps: Record<string, unknown> = {
          id: slug,
          class: classes.join(' '),
        };
        if (shadow)
          hProps.style = `--title-shadow-color:color-mix(in srgb, ${color} 50%, transparent)`;

        let children: any[];
        if (style === 'quote') {
          const defaultPrefix = getIconSvg('bxs:quote-left', '1em');
          const defaultSuffix = getIconSvg('bxs:quote-right', '1em');
          const p =
            attrs.prefix !== undefined
              ? renderIcon(attrs.prefix)
              : { type: 'html', value: defaultPrefix };
          const s = suffixAttr
            ? renderIcon(suffixAttr)
            : { type: 'html', value: defaultSuffix };
          children = [
            p
              ? h(
                  'span',
                  {
                    class: 'md-title-quote-icon',
                    style: `--title-color:${color}`,
                  },
                  [p]
                )
              : undefined,
            h('span', { class: 'md-title-text' }, [{ type: 'text', value: text }]),
            s
              ? h(
                  'span',
                  {
                    class: 'md-title-quote-icon md-title-quote-icon-suffix',
                    style: `--title-color:${color}`,
                  },
                  [s]
                )
              : undefined,
          ].filter(Boolean);
        } else if (style === 'badge') {
          const defaultPrefix = getIconSvg('solar:hashtag-square-bold', '1em');
          const p =
            attrs.prefix !== undefined
              ? renderIcon(attrs.prefix)
              : { type: 'html', value: defaultPrefix };
          const badgeProps: Record<string, unknown> = {
            class: 'md-title-badge',
            style: `--title-color:${color}`,
          };
          const badgeChildren: any[] = [];
          if (p) {
            badgeChildren.push(p);
          }
          children = [
            h('span', badgeProps, badgeChildren),
            h('span', { class: 'md-title-text' }, [{ type: 'text', value: text }]),
          ];
        } else {
          const prefixHtml =
            centered && showPrefix
              ? h('span', { class: 'md-title-prefix' }, [
                  { type: 'text', value: '#'.repeat(level) },
                ])
              : null;
          const iconHtml = icon
            ? h('span', { class: 'md-title-icon' }, [
                { type: 'text', value: icon },
              ])
            : null;
          children = [
            prefixHtml,
            iconHtml,
            h('span', { class: 'md-title-text' }, [{ type: 'text', value: text }]),
          ].filter(Boolean);
        }

        node.data = { hName: tag, hProperties: hProps };
        node.children = children;
      } else if (name === 'reel') {
        const title = attrs.title || '';
        const author = attrs.author || '';
        const date = attrs.date || '';
        const footer = attrs.footer || '';
        const reelChildren = node.children;
        node.data = {
          hName: 'div',
          hProperties: { class: 'md-directive md-directive-reel' },
        };
        node.children = [
          {
            type: 'html',
            value:
              '<div class="md-reel-content"><div class="md-reel-title">' +
              title +
              '</div>',
          },
          ...(author
            ? [
                {
                  type: 'html',
                  value:
                    '<div class="md-reel-meta"><span>' + author + '</span></div>',
                },
              ]
            : []),
          { type: 'html', value: '<div class="md-reel-body"><div class="md-reel-main">' },
          ...reelChildren,
          { type: 'html', value: '</div></div>' },
          ...(date
            ? [{ type: 'html', value: '<div class="md-reel-date">' + date + '</div>' }]
            : []),
          {
            type: 'html',
            value: '<div class="md-reel-footer">' + footer + '</div></div>',
          },
        ];
      } else if (name === 'paper') {
        const paperStyle = attrs.style || '';
        const title = attrs.title || '';
        const author = attrs.author || '';
        const date = attrs.date || '';
        const footer = attrs.footer || '';
        const contentClasses: string[] = ['md-paper-content'];
        if (paperStyle) contentClasses.push(paperStyle);

        const originalChildren = node.children;
        const sectionNodes: any[] = [];
        let currentType = 'paragraph';
        let currentTitle = '';
        let currentContent: any[] = [];

        function flushSection(): void {
          if (currentContent.length === 0) return;
          if (currentType === 'paragraph') {
            sectionNodes.push(
              h('div', { class: 'md-paper-paragraph' }, currentContent)
            );
          } else if (currentType === 'section') {
            sectionNodes.push(
              h('div', { class: 'md-paper-section' }, [
                {
                  type: 'html',
                  value:
                    '<div class="md-paper-section-title">' + currentTitle + '</div>',
                },
                h('div', { class: 'md-paper-section-content' }, currentContent),
              ])
            );
          } else if (currentType === 'line') {
            const alignClass =
              currentTitle === 'right' ? ' md-paper-line-right' : '';
            sectionNodes.push(
              h('div', { class: 'md-paper-line' + alignClass }, currentContent)
            );
          }
          currentContent = [];
        }

        for (const child of originalChildren) {
          let match: RegExpMatchArray | null = null;

          if (child.type === 'html' && child.value) {
            match = child.value.match(
              /<!--\s*(paragraph|section|line)(?:\s+(.*?))?\s*-->/
            );
          }

          if (
            !match &&
            child.type === 'paragraph' &&
            child.children &&
            child.children.length > 0
          ) {
            const firstChild = child.children[0];
            if (firstChild.type === 'html' && firstChild.value) {
              match = firstChild.value.match(
                /<!--\s*(paragraph|section|line)(?:\s+(.*?))?\s*-->/
              );
              if (match && child.children.length === 1) {
                continue;
              }
            }
          }

          if (match) {
            flushSection();
            currentType = match[1];
            currentTitle = (match[2] || '').trim();
            continue;
          }

          currentContent.push(child);
        }
        flushSection();

        node.data = {
          hName: 'div',
          hProperties: { class: 'md-directive md-directive-paper' },
        };
        node.children = [
          {
            type: 'html',
            value:
              '<div class="' +
              contentClasses.join(' ') +
              '"><div class="md-paper-title">' +
              title +
              '</div>',
          },
          h('div', { class: 'md-paper-body' }, sectionNodes),
          {
            type: 'html',
            value:
              '<div class="md-paper-footer">' +
              (author || date
                ? '<div class="md-paper-author-date">' +
                  (author
                    ? '<span class="md-paper-author">' + author + '</span>'
                    : '') +
                  (date
                    ? '<span class="md-paper-date">' + date + '</span>'
                    : '') +
                  '</div>'
                : '') +
              footer +
              '</div></div>',
          },
        ];
      } else if (name === 'ghcard') {
        const type = attrs.type || 'repo';
        const repo = attrs.repo || '';
        const user = attrs.user || '';

        if (type === 'repo' && repo) {
          const apiUrl = `https://api.github.com/repos/${repo}`;
          const tagsApi = `https://api.github.com/repos/${repo}/tags`;
          const html = `<div class="md-directive md-directive-ghcard md-ghcard-repo" data-api="${apiUrl}" data-tags-api="${tagsApi}">
  <a class="md-ghcard-link" href="https://github.com/${repo}" target="_blank" rel="external nofollow noopener noreferrer">
    <div class="md-ghcard-header">
      <span class="md-ghcard-icon">${getIconSvg('lucide:git-fork', '16')}</span>
      <span class="md-ghcard-name">${repo}</span>
    </div>
    <div class="md-ghcard-desc"><span class="md-ghcard-text" data-key="description">&nbsp;</span></div>
    <div class="md-ghcard-stats">
      <div class="md-ghcard-stat">
        <span class="md-ghcard-stat-icon">${getIconSvg('lucide:star', '14')}</span>
        <span class="md-ghcard-text" data-key="stargazers_count">0</span>
      </div>
      <div class="md-ghcard-stat">
        <span class="md-ghcard-stat-icon">${getIconSvg('lucide:git-fork', '14')}</span>
        <span class="md-ghcard-text" data-key="forks_count">0</span>
      </div>
      <div class="md-ghcard-stat">
        <span class="md-ghcard-stat-icon">${getIconSvg('lucide:tag', '14')}</span>
        <span class="md-ghcard-text" data-key="latest-tag-name">-</span>
      </div>
    </div>
  </a>
</div>`;
          node.data = { hName: 'div', hProperties: {} };
          node.children = [{ type: 'html', value: html }];
        } else if (type === 'user' && user) {
          const apiUrl = `https://api.github.com/users/${user}`;
          const bio = attrs.bio || '';
          const showAvatar = attrs.avatar !== 'false';
          const bioHtml = bio
            ? `<p class="md-ghcard-bio" data-key="bio">${bio}</p>`
            : '';
          const avatarHtml = showAvatar
            ? `<div class="md-ghcard-avatar"><img data-key="avatar_url" src="https://github.com/identicons/${user}.png" alt="${user}" loading="lazy" /></div>`
            : '';
          const html = `<div class="md-directive md-directive-ghcard md-ghcard-user" data-api="${apiUrl}">
  <div class="md-ghcard-user-body">
    ${avatarHtml}
    <p class="md-ghcard-username" data-key="name">${user}</p>
    ${bioHtml}
    <div class="md-ghcard-user-stats">
      <a class="md-ghcard-user-stat" href="https://github.com/${user}?tab=followers" target="_blank" rel="external nofollow noopener noreferrer">
        <span class="md-ghcard-text" data-key="followers">0</span>
        <span class="md-ghcard-stat-label">followers</span>
      </a>
      <a class="md-ghcard-user-stat" href="https://github.com/${user}?tab=following" target="_blank" rel="external nofollow noopener noreferrer">
        <span class="md-ghcard-text" data-key="following">0</span>
        <span class="md-ghcard-stat-label">following</span>
      </a>
      <a class="md-ghcard-user-stat" href="https://github.com/${user}?tab=repositories" target="_blank" rel="external nofollow noopener noreferrer">
        <span class="md-ghcard-text" data-key="public_repos">0</span>
        <span class="md-ghcard-stat-label">repos</span>
      </a>
    </div>
    <a class="md-ghcard-follow" href="https://github.com/${user}" target="_blank" rel="external nofollow noopener noreferrer">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .999c-6.074 0-11 5.05-11 11.278c0 4.983 3.152 9.21 7.523 10.702c.55.104.727-.246.727-.543v-2.1c-3.06.683-3.697-1.33-3.697-1.33c-.5-1.304-1.222-1.65-1.222-1.65c-.998-.7.076-.686.076-.686c1.105.08 1.686 1.163 1.686 1.163c.98 1.724 2.573 1.226 3.201.937c.098-.728.383-1.226.698-1.508c-2.442-.286-5.01-1.253-5.01-5.574c0-1.232.429-2.237 1.132-3.027c-.114-.285-.49-1.432.107-2.985c0 0 .924-.303 3.026 1.156c.877-.25 1.818-.375 2.753-.38c.935.005 1.876.13 2.755.38c2.1-1.459 3.023-1.156 3.023-1.156c.598 1.554.222 2.701.108 2.985c.706.79 1.132 1.796 1.132 3.027c0 4.332-2.573 5.286-5.022 5.565c.394.35.754 1.036.754 2.088v3.095c0 .3.176.652.734.542C19.852 21.484 23 17.258 23 12.277C23 6.048 18.075.999 12 .999"/></svg>
      Follow
    </a>
  </div>
</div>`;
          node.data = { hName: 'div', hProperties: {} };
          node.children = [{ type: 'html', value: html }];
        } else {
          node.data = {
            hName: 'div',
            hProperties: { class: 'md-directive md-directive-ghcard' },
          };
          node.children = [
            {
              type: 'html',
              value: '<p style="color:var(--text-secondary);font-size:0.875rem;">请提供有效的 repo（如 owner/repo）或 user 属性</p>',
            },
          ];
        }
      } else if (name === 'sites') {
        const group = attrs.group || '';
        const items = (links && links[group]) || [];

        if (!group) {
          node.data = {
            hName: 'div',
            hProperties: { class: 'md-directive md-directive-sites' },
          };
          node.children = [
            {
              type: 'html',
              value: '<p style="color:var(--text-secondary);font-size:0.875rem;">请提供 group 属性，如 :::sites{group="friends"}</p>',
            },
          ];
        } else if (items.length === 0) {
          node.data = {
            hName: 'div',
            hProperties: { class: 'md-directive md-directive-sites' },
          };
          node.children = [
            {
              type: 'html',
              value: `<p style="color:var(--text-secondary);font-size:0.875rem;">分组 "${group}" 暂无站点数据</p>`,
            },
          ];
        } else {
          const cells = items
            .map((item) => {
              const cover =
                item.cover || getScreenshotUrl(item.url, screenshotService);
              const icon =
                item.icon || `${new URL(item.url).origin}/favicon.ico`;
              const desc = item.description || item.url;
              let labelsHtml = '';
              if (item.labels && item.labels.length > 0) {
                labelsHtml =
                  '<div class="md-sites-labels">' +
                  item.labels
                    .map((l) => {
                      const color = l.color || '#3b82f6';
                      const textColor = labelTextColor(color);
                      return `<span class="md-sites-label" style="background:${color};color:${textColor}">${l.name}</span>`;
                    })
                    .join('') +
                  '</div>';
              }
              return (
                `<div class="md-sites-cell">` +
                `<a class="md-sites-link" href="${item.url}" target="_blank" rel="external nofollow noopener noreferrer">` +
                `<div class="md-sites-cover">` +
                `<img src="${cover}" alt="${item.title}" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.add('md-sites-cover-fallback');" />` +
                `</div>` +
                `<div class="md-sites-info">` +
                `<img class="md-sites-icon" src="${icon}" alt="" loading="lazy" onerror="this.style.display='none'" />` +
                `<span class="md-sites-title">${item.title}</span>` +
                `<span class="md-sites-desc">${desc}</span>` +
                `</div>` +
                labelsHtml +
                `</a>` +
                `</div>`
              );
            })
            .join('');

          const html = `<div class="md-directive md-directive-sites"><div class="md-sites-grid">${cells}</div></div>`;
          node.data = { hName: 'div', hProperties: {} };
          node.children = [{ type: 'html', value: html }];
        }
      } else if (name === 'posters') {
        const group = attrs.group || '';
        const ratio = attrs.ratio || 'portrait';
        const cols = attrs.cols || '';
        const items = (links && links[group]) || [];

        if (!group) {
          node.data = {
            hName: 'div',
            hProperties: { class: 'md-directive md-directive-posters' },
          };
          node.children = [
            {
              type: 'html',
              value: '<p style="color:var(--text-secondary);font-size:0.875rem;">请提供 group 属性，如 :::posters{group="movies"}</p>',
            },
          ];
        } else if (items.length === 0) {
          node.data = {
            hName: 'div',
            hProperties: { class: 'md-directive md-directive-posters' },
          };
          node.children = [
            {
              type: 'html',
              value: `<p style="color:var(--text-secondary);font-size:0.875rem;">分组 "${group}" 暂无海报数据</p>`,
            },
          ];
        } else {
          const cells = items
            .map((item) => {
              const cover = item.cover || item.icon || '';
              const title = item.title || '';
              return (
                `<div class="md-posters-cell">` +
                (item.url
                  ? `<a class="md-posters-link" href="${item.url}" target="_blank" rel="external nofollow noopener noreferrer">`
                  : `<div class="md-posters-link">`) +
                `<div class="md-posters-cover">` +
                (cover
                  ? `<img src="${cover}" alt="${title}" loading="lazy" onerror="this.style.display='none'" />`
                  : '') +
                `</div>` +
                `<div class="md-posters-meta">` +
                (title
                  ? `<span class="md-posters-caption">${title}</span>`
                  : '') +
                `</div>` +
                (item.url ? `</a>` : `</div>`) +
                `</div>`
              );
            })
            .join('');

          const html = `<div class="md-directive md-directive-posters" data-ratio="${ratio}"${cols ? ` data-cols="${cols}"` : ''}><div class="md-posters-grid">${cells}</div></div>`;
          node.data = { hName: 'div', hProperties: {} };
          node.children = [{ type: 'html', value: html }];
        }
      } else if (name === 'panel') {
        const segments: Array<{
          left: string;
          right: string;
          children: any[];
        }> = [];
        let currentLeft = '';
        let currentRight = '';
        let currentContent: any[] = [];

        for (const child of node.children) {
          let match: RegExpMatchArray | null = null;

          if (child.type === 'html' && child.value) {
            match = child.value.match(/<!--\s*label:\s*(.*?)\s*-->/);
          }

          if (
            !match &&
            child.type === 'paragraph' &&
            child.children &&
            child.children.length > 0
          ) {
            const firstChild = child.children[0];
            if (firstChild.type === 'html' && firstChild.value) {
              match = firstChild.value.match(/<!--\s*label:\s*(.*?)\s*-->/);
              if (match && child.children.length === 1) {
                continue;
              }
            }
          }

          if (match) {
            if (currentContent.length > 0) {
              segments.push({
                left: currentLeft,
                right: currentRight,
                children: currentContent,
              });
            }
            const parts = match[1].split('|').map((s: string) => s.trim());
            currentLeft = parts[0] || '';
            currentRight = parts[1] || '';
            currentContent = [];
            continue;
          }

          if (child.type === 'code') {
            const meta = child.meta || '';
            const titleMatch = meta.match(/title=["']([^"']+)["']/);
            const rightMatch = meta.match(/right=["']([^"']+)["']/);
            const left = titleMatch ? titleMatch[1] : child.lang || '';
            const right = rightMatch ? rightMatch[1] : '';

            if (currentContent.length > 0) {
              segments.push({
                left: currentLeft,
                right: currentRight,
                children: currentContent,
              });
              currentContent = [];
              currentLeft = '';
              currentRight = '';
            }

            segments.push({ left, right, children: [child] });
            continue;
          }

          currentContent.push(child);
        }

        if (currentContent.length > 0) {
          segments.push({
            left: currentLeft,
            right: currentRight,
            children: currentContent,
          });
        }

        const uid = `panel-${Math.random().toString(36).slice(2, 7)}`;
        const copyIcon = getIconSvg('lucide:copy', '14');
        const children: any[] = [];

        children.push({ type: 'html', value: '<div class="md-panel-body">' });

        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          const segUid = `${uid}-seg-${i}`;
          const isCode = seg.children.some((c) => c.type === 'code');

          let segCopyText = '';
          for (const c of seg.children) {
            if (c.type === 'code') {
              segCopyText = c.value;
            }
          }
          const safeSegCopyText = segCopyText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

          const leftLabel = seg.left
            ? `<span class="md-segment-label-left">${seg.left}</span>`
            : '';
          const rightHtml = seg.right
            ? `<span class="md-segment-right">${seg.right}</span>`
            : '';
          const copyHtml = segCopyText
            ? `<button class="md-copy-btn md-segment-copy" data-copy-target="${segUid}" aria-label="Copy">${copyIcon}</button>`
            : '';
          const metaHtml =
            rightHtml || copyHtml
              ? `<div class="md-segment-meta">${rightHtml}${copyHtml}</div>`
              : '';
          const headerHtml =
            leftLabel || metaHtml
              ? `<div class="md-segment-header">${leftLabel}${metaHtml}</div>`
              : '';

          children.push({
            type: 'html',
            value: `<div class="md-panel-segment">${headerHtml}`,
          });
          children.push(...seg.children);
          children.push({ type: 'html', value: '</div>' });

          if (segCopyText) {
            children.push({
              type: 'html',
              value: `<textarea id="${segUid}" class="md-copy-source" readonly style="position:absolute;left:-9999px;opacity:0;pointer-events:none;">${safeSegCopyText}</textarea>`,
            });
          }

          if (i < segments.length - 1) {
            children.push({
              type: 'html',
              value: '<div class="md-panel-divider"></div>',
            });
          }
        }

        children.push({ type: 'html', value: '</div>' });

        node.data = {
          hName: 'div',
          hProperties: { class: 'md-directive md-directive-panel' },
        };
        node.children = children;
      } else if (name === 'private') {
        const password = attrs.password || '';
        const hint = attrs.hint || '';

        if (!password) {
          node.data = {
            hName: 'div',
            hProperties: { class: 'md-directive md-directive-private' },
          };
          node.children = [
            {
              type: 'html',
              value: '<p style="color:var(--text-secondary);font-size:0.875rem;">请提供 password 属性，如 :::private{password="xxx"}</p>',
            },
          ];
        } else {
          const html = serializeToHtml(node.children);
          const encrypted = encryptPrivateContent(html, password);

          const lockIcon = getIconSvg('lucide:lock', '20');
          const unlockIcon = getIconSvg('lucide:lock-open', '20');
          const eyeOpenIcon = getIconSvg('lucide:eye', '16');
          const eyeCloseIcon = getIconSvg('lucide:eye-off', '16');

          const hintHtml = hint
            ? `<div class="md-private-hint">提示：${escapeHtml(hint)}</div>`
            : '';

          node.data = {
            hName: 'div',
            hProperties: {
              class: 'md-directive md-directive-private',
              'data-payload': encrypted,
            },
          };
          node.children = [
            {
              type: 'html',
              value: `<div class="md-private-locked">
    <div class="md-private-icon">${lockIcon}</div>
    <div class="md-private-title">私密内容</div>
    <div class="md-private-desc">此内容已加密，请输入密码查看</div>
    ${hintHtml}
    <div class="md-private-form">
        <div class="md-private-input-wrap">
            <input type="password" class="md-private-input" placeholder="请输入密码" />
            <button type="button" class="md-private-toggle" aria-label="显示密码">
                <span class="md-private-eye-open">${eyeOpenIcon}</span>
                <span class="md-private-eye-close">${eyeCloseIcon}</span>
            </button>
        </div>
        <button type="button" class="md-private-btn">查看</button>
    </div>
    <div class="md-private-error">密码错误，请重试</div>
</div>
<div class="md-private-unlocked" style="display:none">
    <div class="md-private-header">
        <span class="md-private-status">${unlockIcon}<span>已解锁</span></span>
        <button type="button" class="md-private-lock-btn">${lockIcon}<span>重新锁定</span></button>
    </div>
    <div class="md-private-content"></div>
</div>`,
            },
          ];
        }
      } else if (name === 'video') {
        const src = attrs.src || '';
        const bilibili = attrs.bilibili || '';
        const youtube = attrs.youtube || '';
        const poster = attrs.poster || '';
        const ratio = attrs.ratio || '16/9';
        const width = attrs.width || '';
        const align = attrs.align || '';
        const autoplay = attrs.autoplay === 'true' || attrs.autoplay === '';
        const pip = attrs.pip || 'auto';

        function ratioToPadding(r: string): string {
          const parts = r.split('/').map(Number);
          if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
            return ((parts[1] / parts[0]) * 100).toFixed(4) + '%';
          }
          return '56.25%';
        }
        const ratioPct = ratioToPadding(ratio);
        let containerStyle = `--video-ratio-pct:${ratioPct};`;
        if (width) containerStyle += `--video-width:${width};`;
        if (align) containerStyle += `--video-align:${align};`;

        const uid = `video-${Math.random().toString(36).slice(2, 7)}`;
        const playIcon = getIconSvg('lucide:play', '36');

        if (src) {
          let videoHtml: string;
          const pipBtnIcon = getIconSvg('lucide:picture-in-picture', '16');
          const pipBtnHtml =
            pip === 'manual'
              ? `<button type="button" class="md-video-pip-btn" data-video-pip="${uid}" aria-label="画中画">${pipBtnIcon}</button>`
              : '';
          if (poster) {
            videoHtml = `<img class="md-video-poster-img" src="${poster}" alt="" loading="lazy" onerror="this.style.display='none'" /><video class="md-video-element" id="${uid}" src="${src}" preload="metadata" playsinline disablePictureInPicture ${autoplay ? 'autoplay muted ' : ''}data-pip-video="${uid}" data-pip-mode="${pip}"></video><div class="md-video-overlay" data-video-id="${uid}"><button type="button" class="md-video-play-btn" data-video-play="${uid}" aria-label="播放">${playIcon}</button></div>${pipBtnHtml}`;
            node.data = {
              hName: 'div',
              hProperties: {
                class: 'md-directive md-directive-video md-video-has-poster',
                style: containerStyle,
              },
            };
          } else {
            videoHtml = `<video class="md-video-element" id="${uid}" src="${src}" controls preload="metadata" playsinline disablePictureInPicture ${autoplay ? 'autoplay muted ' : ''}data-pip-video="${uid}" data-pip-mode="${pip}"></video>${pipBtnHtml}`;
            node.data = {
              hName: 'div',
              hProperties: {
                class: 'md-directive md-directive-video',
                style: containerStyle,
              },
            };
          }
          node.children = [
            { type: 'html', value: `<div class="md-video-wrap">${videoHtml}</div>` },
          ];
        } else if (bilibili) {
          const bvid = bilibili.startsWith('BV') ? bilibili : 'BV' + bilibili;
          const iframeSrc = `//player.bilibili.com/player.html?bvid=${bvid}&autoplay=${autoplay ? 1 : 0}&page=1&high_quality=1&as_wide=1`;
          node.data = {
            hName: 'div',
            hProperties: {
              class: 'md-directive md-directive-video md-video-iframe',
              style: containerStyle,
            },
          };
          node.children = [
            {
              type: 'html',
              value: `<div class="md-video-wrap">
                            <iframe src="${iframeSrc}" frameborder="0" allowfullscreen scrolling="no" allow="fullscreen" title="${escapeHtml('Bilibili 视频')}"></iframe>
                        </div>`,
            },
          ];
        } else if (youtube) {
          let iframeSrc = `https://www.youtube.com/embed/${youtube}?rel=0`;
          if (autoplay) iframeSrc += '&autoplay=1&mute=1';
          node.data = {
            hName: 'div',
            hProperties: {
              class: 'md-directive md-directive-video md-video-iframe',
              style: containerStyle,
            },
          };
          node.children = [
            {
              type: 'html',
              value: `<div class="md-video-wrap">
                            <iframe src="${iframeSrc}" frameborder="0" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" title="${escapeHtml('YouTube 视频')}"></iframe>
                        </div>`,
            },
          ];
        } else {
          node.data = {
            hName: 'div',
            hProperties: {
              class: 'md-directive md-directive-video',
              style: containerStyle,
            },
          };
          node.children = [
            {
              type: 'html',
              value: '<p style="color:var(--text-secondary);font-size:0.875rem;">请提供 src、bilibili 或 youtube 属性</p>',
            },
          ];
        }
      } else if (name === 'audio') {
        const src = attrs.src || '';
        const netease = attrs.netease || '';
        const voice = attrs.voice || '';
        const title = attrs.title || '';
        const artist = attrs.artist || '';
        const cover = attrs.cover || '';
        const duration = attrs.duration || '';
        const align = attrs.align || '';
        const width = attrs.width || '';
        const uid = `audio-${Math.random().toString(36).slice(2, 7)}`;

        let containerStyle = '';
        if (align) containerStyle += `--audio-align:${align};`;
        if (width) containerStyle += `--audio-width:${width};`;

        if (netease) {
          const neteaseMode = attrs.mode || 'mini';
          const isCard = neteaseMode === 'card';
          const iframeHeight = isCard ? 86 : 52;
          const iframeWidth = isCard ? 330 : 298;
          const playerHeight = isCard ? 66 : 32;
          const neteaseClass = isCard
            ? 'md-audio-netease md-audio-netease-card'
            : 'md-audio-netease';

          node.data = {
            hName: 'div',
            hProperties: {
              class: `md-directive md-directive-audio ${neteaseClass}`,
              'data-netease': netease,
              'data-title': title || '网易云音乐',
              'data-artist': artist || '',
              ...(containerStyle ? { style: containerStyle } : {}),
            },
          };
          node.children = [
            {
              type: 'html',
              value: `<div class="md-audio-netease-wrap${isCard ? ' md-audio-netease-wrap-card' : ''}"><iframe src="//music.163.com/outchain/player?type=2&id=${netease}&auto=0&height=${playerHeight}" frameborder="no" border="0" marginwidth="0" marginheight="0" width="${iframeWidth}" height="${iframeHeight}" title="${escapeHtml(title || '网易云音乐')}"></iframe></div>`,
            },
          ];
        } else if (voice) {
          node.data = {
            hName: 'div',
            hProperties: {
              class: 'md-directive md-directive-audio md-audio-voice',
              'data-src': voice,
              'data-duration': duration,
              ...(containerStyle ? { style: containerStyle } : {}),
            },
          };
          node.children = [
            {
              type: 'html',
              value: `<div class="md-audio-voice-player"><button type="button" class="md-voice-play" aria-label="播放"><span class="md-voice-icon-play">${getIconSvg('lucide:play', '14')}</span><span class="md-voice-icon-pause" style="display:none">${getIconSvg('lucide:pause', '14')}</span></button><canvas class="md-voice-wave" width="200" height="28"></canvas><span class="md-voice-duration">${duration ? duration + '"' : ''}</span></div>`,
            },
          ];
        } else if (src) {
          const playIcon = getIconSvg('lucide:play', '18');
          const pauseIcon = getIconSvg('lucide:pause', '18');
          const coverHtml = cover
            ? `<img src="${cover}" alt="${escapeHtml(title || '封面')}" loading="lazy" />`
            : `<div class="md-audio-cover-default">${getIconSvg('lucide:music', '18')}</div>`;
          const autoplayAttr =
            attrs.autoplay === 'true' || attrs.autoplay === ''
              ? ' autoplay'
              : '';

          node.data = {
            hName: 'div',
            hProperties: {
              class: 'md-directive md-directive-audio',
              'data-src': src,
              ...(containerStyle ? { style: containerStyle } : {}),
            },
          };
          node.children = [
            {
              type: 'html',
              value: `<div class="md-audio-player" id="${uid}"${autoplayAttr ? ' data-autoplay="1"' : ''}>
    <div class="md-audio-cover">${coverHtml}</div>
    <div class="md-audio-meta">
        <div class="md-audio-title">${escapeHtml(title || '未知标题')}</div>
        <div class="md-audio-artist">${escapeHtml(artist || '')}</div>
    </div>
    <button type="button" class="md-audio-btn" aria-label="播放">
        <span class="md-audio-play">${playIcon}</span>
        <span class="md-audio-pause" style="display:none">${pauseIcon}</span>
    </button>
    <div class="md-audio-progress-wrap">
        <span class="md-audio-time-current">00:00</span>
        <div class="md-audio-progress-bar">
            <div class="md-audio-progress-fill"></div>
        </div>
        <span class="md-audio-time-total">00:00</span>
    </div>
    <audio preload="metadata" style="display:none"${autoplayAttr}><source src="${src}" type="audio/mpeg"></audio>
</div>`,
            },
          ];
        } else {
          node.data = {
            hName: 'div',
            hProperties: {
              class: 'md-directive md-directive-audio',
              ...(containerStyle ? { style: containerStyle } : {}),
            },
          };
          node.children = [
            {
              type: 'html',
              value: '<p style="color:var(--text-secondary);font-size:0.875rem;">请提供 src、netease 或 voice 属性</p>',
            },
          ];
        }
      }
    });
  };
}
