import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function inlineFormat(text: string): string {
  return (
    text
      // Strip LaTeX inline math $...$ → just the content
      .replace(/\$([^$\n]+)\$/g, '$1')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic (single *, not preceded/followed by another *)
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Citation superscripts [n] — rendered by TipTap as plain text; keep visible
      .replace(/\[(\d+)\]/g, '<sup>[$1]</sup>')
  );
}

/**
 * Converts AI-generated markdown (with optional LaTeX) into TipTap-compatible HTML.
 * Handles: headings, bold/italic, bullet lists, paragraphs, citations, LaTeX stripping.
 */
export function markdownToHtml(md: string): string {
  if (!md || !md.trim()) return '<p></p>';

  // 1. Strip block-level LaTeX: $$...$$
  let src = md.replace(/\$\$[\s\S]*?\$\$/g, '');

  // 2. Normalise line endings
  src = src.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 3. Ensure headings always start on their own line
  src = src.replace(/([^\n])(#{1,3} )/g, '$1\n\n$2');

  // 4. Split on blank lines to get blocks
  const rawBlocks = src.split(/\n{2,}/);

  const html = rawBlocks
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) return '';

      // Check heading on first (or only) line
      if (lines[0].startsWith('### ')) {
        return `<h3>${inlineFormat(lines[0].slice(4))}</h3>` +
          (lines.length > 1 ? buildBlock(lines.slice(1)) : '');
      }
      if (lines[0].startsWith('## ')) {
        return `<h2>${inlineFormat(lines[0].slice(3))}</h2>` +
          (lines.length > 1 ? buildBlock(lines.slice(1)) : '');
      }
      if (lines[0].startsWith('# ')) {
        return `<h1>${inlineFormat(lines[0].slice(2))}</h1>` +
          (lines.length > 1 ? buildBlock(lines.slice(1)) : '');
      }

      return buildBlock(lines);
    })
    .filter(Boolean)
    .join('');

  return html || '<p></p>';
}

function buildBlock(lines: string[]): string {
  // If ALL lines are list items, wrap in <ul>
  const listRe = /^[\*\-\•] /;
  const allList = lines.every((l) => listRe.test(l));
  if (allList) {
    const items = lines.map((l) => `<li>${inlineFormat(l.replace(listRe, ''))}</li>`).join('');
    return `<ul>${items}</ul>`;
  }

  // Mixed block: process line by line
  let out = '';
  let listOpen = false;
  for (const line of lines) {
    if (line.startsWith('### ')) {
      if (listOpen) { out += '</ul>'; listOpen = false; }
      out += `<h3>${inlineFormat(line.slice(4))}</h3>`;
    } else if (line.startsWith('## ')) {
      if (listOpen) { out += '</ul>'; listOpen = false; }
      out += `<h2>${inlineFormat(line.slice(3))}</h2>`;
    } else if (line.startsWith('# ')) {
      if (listOpen) { out += '</ul>'; listOpen = false; }
      out += `<h1>${inlineFormat(line.slice(2))}</h1>`;
    } else if (listRe.test(line)) {
      if (!listOpen) { out += '<ul>'; listOpen = true; }
      out += `<li>${inlineFormat(line.replace(listRe, ''))}</li>`;
    } else {
      if (listOpen) { out += '</ul>'; listOpen = false; }
      out += `<p>${inlineFormat(line)}</p>`;
    }
  }
  if (listOpen) out += '</ul>';
  return out;
}
