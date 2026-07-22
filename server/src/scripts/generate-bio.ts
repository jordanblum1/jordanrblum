import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

// This script runs at build time (see package.json "generate:bio") and
// checks its output into src/generated/bio.ts. It pulls Jordan's bio content
// straight from the site's own data so the two never drift, and strips the
// email address before anything is written to disk — the assistant's system
// prompt must never contain it (see lib/systemPrompt.ts).

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');

interface ExperienceTrack {
  title: string;
  summary: string;
  highlights: string[];
}

interface ExperienceItem {
  company: string;
  role: string;
  date: string;
  context: string;
  bridge?: string;
  summary?: string;
  highlights?: string[];
  tracks?: ExperienceTrack[];
}

interface SiteModule {
  hero: { statement: string; support: string };
  about: { title: string; paragraphs: string[] };
  education: { school: string; degree: string; date: string };
  toolkit: string[];
  experience: ExperienceItem[];
  selectedWork: Array<{ title: string; blurb: string }>;
}

function redact(text: string): string {
  return text
    .replace(/mailto:[^\s")>\]]+/gi, '[contact link removed]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email removed]');
}

async function main() {
  const siteModulePath = resolve(repoRoot, 'src/data/site.ts');
  const site = (await import(pathToFileURL(siteModulePath).href)) as SiteModule;

  const sections: string[] = [];
  sections.push(site.hero.statement);
  sections.push(site.hero.support);
  sections.push(site.about.title);
  sections.push(...site.about.paragraphs);
  sections.push(`Education: ${site.education.degree}, ${site.education.school} (${site.education.date}).`);
  sections.push(`Toolkit: ${site.toolkit.join(', ')}.`);

  for (const item of site.experience) {
    sections.push(`${item.company} — ${item.role} (${item.date}). ${item.context}`);
    if (item.bridge) sections.push(item.bridge);
    if (item.summary) sections.push(item.summary);
    if (item.highlights) sections.push(...item.highlights);
    if (item.tracks) {
      for (const track of item.tracks) {
        sections.push(`${track.title}: ${track.summary}`);
        sections.push(...track.highlights);
      }
    }
  }

  for (const work of site.selectedWork) {
    sections.push(`${work.title}: ${work.blurb}`);
  }

  const siteBio = sections.join('\n\n');
  const llmsTxt = readFileSync(resolve(repoRoot, 'public/llms.txt'), 'utf8');

  const combined = redact(`${siteBio}\n\n---\n\n${llmsTxt}`);

  const outputPath = resolve(here, '../generated/bio.ts');
  const fileContents = `// GENERATED FILE — run \`pnpm generate:bio\` (from server/) to regenerate.
// Source: ../../../src/data/site.ts and ../../../public/llms.txt, with the
// email address and any mailto: links stripped. Do not edit by hand.
export const BIO_MARKDOWN = ${JSON.stringify(combined)};
`;
  writeFileSync(outputPath, fileContents);
  console.log(`Wrote ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
