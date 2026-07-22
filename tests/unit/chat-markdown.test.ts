// @vitest-environment happy-dom
import { expect, test } from 'vitest';
import { MarkdownStream, renderMarkdownInto, splitBlocks } from '../../src/scripts/chat-markdown';

function render(text: string): HTMLDivElement {
  const div = document.createElement('div');
  renderMarkdownInto(div, text);
  return div;
}

// --- Block splitting ---------------------------------------------------------

test('splitBlocks separates paragraphs on blank lines', () => {
  expect(splitBlocks('one\n\ntwo\n\n\nthree')).toEqual(['one', 'two', 'three']);
});

test('splitBlocks keeps blank lines inside a code fence in one block', () => {
  expect(splitBlocks('```\na\n\nb\n```')).toEqual(['```\na\n\nb\n```']);
});

test('splitBlocks lets an unterminated fence absorb the rest of the text', () => {
  expect(splitBlocks('para\n\n```js\ncode\n\nmore')).toEqual(['para', '```js\ncode\n\nmore']);
});

// --- Inline correctness ------------------------------------------------------

test('renders bold as strong', () => {
  const el = render('this is **important** stuff');
  const strong = el.querySelector('strong');
  expect(strong?.textContent).toBe('important');
  expect(el.textContent).toBe('this is important stuff');
});

test('renders italic with * and _', () => {
  expect(render('an *emphasis*').querySelector('em')?.textContent).toBe('emphasis');
  expect(render('an _emphasis_').querySelector('em')?.textContent).toBe('emphasis');
});

test('renders italic nested inside bold', () => {
  const strong = render('**bold with *nested***').querySelector('strong');
  expect(strong).toBeTruthy();
  expect(strong?.querySelector('em')?.textContent).toBe('nested');
});

test('renders inline code with literal content', () => {
  const code = render('run `pnpm build` now').querySelector('code');
  expect(code?.textContent).toBe('pnpm build');
});

test('inline code content is not parsed for emphasis', () => {
  const el = render('`**not bold**`');
  expect(el.querySelector('strong')).toBeNull();
  expect(el.querySelector('code')?.textContent).toBe('**not bold**');
});

test('renders a fenced code block with the language line stripped', () => {
  const el = render('```ts\nconst a = 1;\nconst b = 2;\n```');
  const pre = el.querySelector('pre');
  expect(pre?.querySelector('code')?.textContent).toBe('const a = 1;\nconst b = 2;');
});

test('renders an unterminated fence as a plain pre block', () => {
  const el = render('```js\nconst a = 1;');
  expect(el.querySelector('pre code')?.textContent).toBe('const a = 1;');
});

test('renders unordered lists', () => {
  const el = render('- one\n- two\n* three');
  const items = Array.from(el.querySelectorAll('ul > li')).map((li) => li.textContent);
  expect(items).toEqual(['one', 'two', 'three']);
});

test('renders ordered lists with a start offset', () => {
  const el = render('3. three\n4. four');
  const ol = el.querySelector('ol');
  expect(ol?.getAttribute('start')).toBe('3');
  expect(Array.from(el.querySelectorAll('ol > li')).map((li) => li.textContent)).toEqual(['three', 'four']);
});

test('list items support inline markdown', () => {
  const el = render('- **bold** item\n- `code` item');
  expect(el.querySelector('li strong')?.textContent).toBe('bold');
  expect(el.querySelectorAll('li')[1].querySelector('code')?.textContent).toBe('code');
});

test('renders http(s) links with safe attributes', () => {
  const a = render('see [my site](https://blumjordan.com) here').querySelector('a');
  expect(a?.getAttribute('href')).toBe('https://blumjordan.com');
  expect(a?.getAttribute('target')).toBe('_blank');
  expect(a?.getAttribute('rel')).toBe('noopener noreferrer');
  expect(a?.textContent).toBe('my site');
});

test('single newlines inside a paragraph become line breaks', () => {
  expect(render('line one\nline two').querySelectorAll('p br')).toHaveLength(1);
});

// --- XSS vectors -------------------------------------------------------------

test('HTML in model text stays literal — no img element is ever created', () => {
  const el = render('<img src=x onerror="alert(1)">');
  expect(el.querySelector('img')).toBeNull();
  expect(el.textContent).toContain('<img src=x onerror="alert(1)">');
});

test('script tags render as text, including inside code blocks', () => {
  const inline = render('<script>alert(1)</script>');
  expect(inline.querySelector('script')).toBeNull();
  expect(inline.textContent).toContain('<script>alert(1)</script>');

  const fenced = render('```html\n<script>alert(1)</script>\n```');
  expect(fenced.querySelector('script')).toBeNull();
  expect(fenced.querySelector('pre code')?.textContent).toBe('<script>alert(1)</script>');
});

test('javascript: links are rejected and render as plain text', () => {
  const el = render('[click me](javascript:alert(1))');
  expect(el.querySelector('a')).toBeNull();
  expect(el.textContent).toBe('[click me](javascript:alert(1))');
});

test('data: and mailto: links are rejected too', () => {
  expect(render('[x](data:text/html,<script>)').querySelector('a')).toBeNull();
  expect(render('[x](mailto:someone@example.com)').querySelector('a')).toBeNull();
});

test('markup inside emphasis and links stays literal', () => {
  const el = render('**<b>bold</b>** and [<i>x</i>](https://example.com)');
  expect(el.querySelector('b')).toBeNull();
  expect(el.querySelector('i')).toBeNull();
  expect(el.querySelector('strong')?.textContent).toBe('<b>bold</b>');
  expect(el.querySelector('a')?.textContent).toBe('<i>x</i>');
});

test('unterminated markers render literally', () => {
  expect(render('**abc').textContent).toBe('**abc');
  expect(render('*abc').textContent).toBe('*abc');
  expect(render('`abc').textContent).toBe('`abc');
  expect(render('[abc](https://example.com').textContent).toBe('[abc](https://example.com');
});

test('empty emphasis markers render literally', () => {
  expect(render('** ** and * *').querySelector('strong')).toBeNull();
  expect(render('** ** and * *').querySelector('em')).toBeNull();
});

// --- Streaming ---------------------------------------------------------------

test('MarkdownStream finalizes completed blocks once and never reprocesses them', () => {
  const container = document.createElement('div');
  const stream = new MarkdownStream(container);

  stream.append('First paragraph');
  stream.append(' keeps growing');
  expect(container.children).toHaveLength(1);

  stream.append('\n\nSecond **block**');
  expect(container.children).toHaveLength(2);
  const finalizedFirst = container.children[0];
  expect(finalizedFirst.textContent).toBe('First paragraph keeps growing');

  const liveBefore = container.children[1];
  stream.append(' grows more');
  // The finalized block is the exact same node; only the live block re-rendered.
  expect(container.children[0]).toBe(finalizedFirst);
  expect(container.children[1]).not.toBe(liveBefore);
  expect(container.children[1].querySelector('strong')?.textContent).toBe('block');
  expect(container.children[1].textContent).toBe('Second block grows more');
});

test('MarkdownStream renders a growing unterminated fence as pre until it closes', () => {
  const container = document.createElement('div');
  const stream = new MarkdownStream(container);

  stream.append('```js\nconst a = 1;');
  expect(container.children[0].tagName).toBe('PRE');
  expect(container.children[0].textContent).toBe('const a = 1;');

  stream.append('\nconst b = 2;\n```\n\nDone.');
  expect(container.children).toHaveLength(2);
  expect(container.children[0].tagName).toBe('PRE');
  expect(container.children[0].textContent).toBe('const a = 1;\nconst b = 2;');
  expect(container.children[1].textContent).toBe('Done.');
});

test('MarkdownStream matches the full render for the same text', () => {
  const text = 'Intro with **bold**\n\n- a\n- b\n\n```\ncode\n```\n\nBye [x](https://example.com)';
  const container = document.createElement('div');
  const stream = new MarkdownStream(container);
  for (const char of text) stream.append(char);
  expect(container.innerHTML).toBe(render(text).innerHTML);
  expect(stream.value).toBe(text);
});
