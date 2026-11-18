import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const source = 'src/assets/spray/source/jordan-painter-workwear.gif';
const output = 'src/assets/spray/painter-motion';
const { pages: frames, pageHeight, width, delay } = await sharp(source, { animated: true }).metadata();
if (!frames || !pageHeight || !width || !delay?.length) throw new Error('Expected an animated painter GIF');
if (new Set(delay).size !== 1) throw new Error('Painter frames must have equal durations');
const columns = Math.ceil(Math.sqrt(frames));
const rows = Math.ceil(frames / columns);
const frameWidth = 256;
const frameHeight = Math.round(frameWidth * pageHeight / width);
const cells = await Promise.all(Array.from({ length: frames }, async (_, index) => ({
  input: await sharp(source, { page: index }).resize(frameWidth, frameHeight).png().toBuffer(),
  left: index % columns * frameWidth,
  top: Math.floor(index / columns) * frameHeight,
})));
await sharp({ create: { width: columns * frameWidth, height: rows * frameHeight, channels: 4, background: '#00000000' } })
  .composite(cells).webp({ quality: 90, effort: 6 }).toFile(`${output}.webp`);
await writeFile(`${output}.json`, JSON.stringify({ frames, columns, rows, frameWidth, frameHeight, frameDurationMs: delay[0] }, null, 2) + '\n');
