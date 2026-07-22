// Safe, dependency-free markdown subset renderer for chat messages.
//
// Supported: **bold**, *italic* / _italic_, `inline code`, ``` fenced code
// blocks, unordered (- or *) and ordered (1.) lists, and [links](https://…)
// restricted to http(s).
//
// Safety: every node is built with document.createElement + textContent —
// model text is NEVER assigned to innerHTML, so any markup in the text stays
// literal. Links that are not http(s) render as plain text; allowed links open
// in a new tab with rel="noopener noreferrer".
//
// Streaming: MarkdownStream renders block-incrementally — once a block is
// complete (a blank line separates it from later text) it is appended once and
// never reprocessed; only the still-growing final block re-renders per delta.
// An unterminated code fence is simply the growing block, rendered as a plain
// pre element until its closing fence arrives.

const FENCE_RE = /^\s*```/;
const UL_ITEM_RE = /^\s*[-*]\s+/;
const OL_ITEM_RE = /^\s*(\d+)[.)]\s+/;

// Splits markdown into block strings. Blocks are separated by blank lines,
// except inside a code fence, which absorbs blank lines (and, when
// unterminated, everything to the end of the text).
export function splitBlocks(text: string): string[] {
  const blocks: string[] = [];
  let current: string[] = [];
  let inFence = false;

  const flush = (): void => {
    if (current.length) {
      blocks.push(current.join('\n'));
      current = [];
    }
  };

  for (const line of text.split('\n')) {
    if (FENCE_RE.test(line)) {
      if (inFence) {
        current.push(line);
        inFence = false;
        flush();
      } else {
        flush();
        inFence = true;
        current.push(line);
      }
      continue;
    }
    if (inFence) {
      current.push(line);
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    current.push(line);
  }
  flush();
  return blocks;
}

// Renders inline markdown (bold/italic/code/links) into `parent` as DOM nodes.
// Unterminated markers fall through as literal characters.
function appendInline(parent: Node, text: string): void {
  let plain = '';
  let i = 0;

  const flushPlain = (): void => {
    if (plain) {
      parent.appendChild(document.createTextNode(plain));
      plain = '';
    }
  };

  while (i < text.length) {
    const ch = text[i];

    if (ch === '`') {
      const end = text.indexOf('`', i + 1);
      if (end > i) {
        flushPlain();
        const code = document.createElement('code');
        code.textContent = text.slice(i + 1, end);
        parent.appendChild(code);
        i = end + 1;
        continue;
      }
    } else if (ch === '*' || ch === '_') {
      const double = text.startsWith(ch + ch, i);
      const marker = double ? ch + ch : ch;
      let end = text.indexOf(marker, i + marker.length);
      // A closer inside a longer delimiter run (e.g. the `***` ending
      // `**bold with *nested***`) shifts right so the run splits correctly.
      while (end > 0 && text[end + marker.length] === ch) end += 1;
      const inner = end > 0 ? text.slice(i + marker.length, end) : '';
      const prev = i > 0 ? text[i - 1] : '';
      const next = end > 0 ? (text[end + marker.length] ?? '') : '';
      const intraword = ch === '_' && (/\w/.test(prev) || /\w/.test(next));
      // CommonMark-style flanking: emphasis content can't start or end with
      // whitespace, so stray asterisks like `* *` stay literal.
      if (end > 0 && inner && !/^\s/.test(inner) && !/\s$/.test(inner) && !intraword) {
        flushPlain();
        const el = document.createElement(double ? 'strong' : 'em');
        appendInline(el, inner);
        parent.appendChild(el);
        i = end + marker.length;
        continue;
      }
    } else if (ch === '[') {
      const close = text.indexOf(']', i);
      if (close > i && text[close + 1] === '(') {
        const endParen = text.indexOf(')', close + 2);
        if (endParen > close) {
          const url = text.slice(close + 2, endParen).trim();
          // http(s) only — javascript:, data:, mailto: etc. fall through as text.
          if (/^https?:\/\//i.test(url)) {
            flushPlain();
            const a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            appendInline(a, text.slice(i + 1, close));
            parent.appendChild(a);
            i = endParen + 1;
            continue;
          }
        }
      }
    }

    plain += ch;
    i += 1;
  }
  flushPlain();
}

// Renders a single block string to an element.
export function renderBlock(source: string): HTMLElement {
  const lines = source.split('\n');
  const first = lines[0] ?? '';

  if (FENCE_RE.test(first)) {
    const closed = lines.length > 1 && FENCE_RE.test(lines[lines.length - 1]);
    const body = closed ? lines.slice(1, -1) : lines.slice(1);
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = body.join('\n');
    pre.appendChild(code);
    return pre;
  }

  const ordered = OL_ITEM_RE.test(first);
  if (ordered || UL_ITEM_RE.test(first)) {
    const itemRe = ordered ? OL_ITEM_RE : UL_ITEM_RE;
    const list = document.createElement(ordered ? 'ol' : 'ul');
    if (ordered) {
      const start = Number(first.match(OL_ITEM_RE)![1]);
      if (start !== 1) list.setAttribute('start', String(start));
    }
    let item: HTMLLIElement | null = null;
    let itemText = '';
    const flushItem = (): void => {
      if (item) appendInline(item, itemText);
    };
    for (const line of lines) {
      if (itemRe.test(line)) {
        flushItem();
        item = document.createElement('li');
        list.appendChild(item);
        itemText = line.replace(itemRe, '');
      } else if (item) {
        // A wrapped continuation line belongs to the previous item.
        itemText += ` ${line.trim()}`;
      }
    }
    flushItem();
    return list;
  }

  const p = document.createElement('p');
  lines.forEach((line, index) => {
    if (index) p.appendChild(document.createElement('br'));
    appendInline(p, line);
  });
  return p;
}

// Full render (e.g. restoring history from sessionStorage).
export function renderMarkdownInto(container: HTMLElement, text: string): void {
  container.replaceChildren();
  for (const block of splitBlocks(text)) container.appendChild(renderBlock(block));
}

// Block-incremental streaming renderer.
export class MarkdownStream {
  private text = '';
  private finalized = 0;
  private live: HTMLElement | null = null;

  constructor(private readonly container: HTMLElement) {}

  append(delta: string): void {
    this.text += delta;
    const blocks = splitBlocks(this.text);
    if (!blocks.length) return;

    this.live?.remove();
    this.live = null;

    // Every block before the last is final: a blank line (outside any fence)
    // already separates it from the text still streaming in.
    while (this.finalized < blocks.length - 1) {
      this.container.appendChild(renderBlock(blocks[this.finalized]));
      this.finalized += 1;
    }

    this.live = renderBlock(blocks[blocks.length - 1]);
    this.container.appendChild(this.live);
  }

  get value(): string {
    return this.text;
  }
}
