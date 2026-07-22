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

// Curated, hand-reviewed PUBLIC-ONLY supplement. Every fact below comes from
// content Jordan has already published (blumjordan.com/llms.txt, live public
// sites, public GitHub repos). Nothing here may come from private repos or
// notes, and it must never contain an email address or new contact channels.
// Hardcoded here (not fetched) so it survives regeneration and stays reviewed.
const PUBLIC_SUPPLEMENT = `## Curated public supplement (reviewed additions)

### Roam quick facts

- Jordan joined Roam just after its $11.5M Series A, as engineer #3 on a four-person team.
- On Reed, Roam's AI realtor, he owns most of the AI infrastructure and its evaluation systems.
- His vision-model evaluation selected a model that met the production quality bar at about $0.049 per listing versus a roughly $0.671-per-listing comparison model.
- Conversation analytics he built surfaced a 13x completion improvement after a photo-upload UX change.

### Chicks of NYC (https://chicksofnyc.com)

A New York City chicken-wing review site Jordan runs with friends. Wings are scored on a 0-10 rubric across three categories: Sauce, Crispy-ness, and Meat Quality. The site's tongue-in-cheek mission: get paid to eat chicken wings.

### blumblumblum (https://blumblumblum.com)

Jordan's hand-rolled, framework-free personal link hub. It links out to his portfolio, his GitHub, a photo gallery of his travel photography (https://blumblumblum-gallery.vercel.app), his Strava (he's a cyclist), a Spotify playlist called "Jordan's rotation", and his Instagram.

### Craft values

Jordan likes to hand-roll his personal sites without frameworks, and he designs with a light-only token-based design system — deliberate, minimal, and his own.

### Older public projects

- poker-night: a TypeScript poker settle-up app for tracking who owes whom after a game.
- stock-analyzer: a Python tool that ranks stocks by news sentiment using Alpha Vantage and news APIs.
- jordans-jams: a legacy Twilio SMS app that texted subscribers his top two songs each week.

### This website's secret

The site hides one small easter egg. Jordy may playfully hint that it exists, but must never reveal what it is or how to trigger it.`;

function redact(text: string): string {
  return text
    .replace(/mailto:[^\s")>\]]+/gi, '[contact link removed]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email removed]');
}

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

  // The supplement is hand-reviewed and contains no email, but run it through
  // redact() anyway so the no-email invariant holds even if it's ever edited.
  const combined = redact(`${siteBio}\n\n---\n\n${llmsTxt}\n\n---\n\n${PUBLIC_SUPPLEMENT}`);

  const outputPath = resolve(here, '../generated/bio.ts');
  const fileContents = `// GENERATED FILE — run \`pnpm generate:bio\` (from server/) to regenerate.
// Source: ../../../src/data/site.ts, ../../../public/llms.txt, and the curated
// public supplement in scripts/generate-bio.ts, with the email address and any
// mailto: links stripped. Do not edit by hand.
export const BIO_MARKDOWN = ${JSON.stringify(combined)};
`;
  writeFileSync(outputPath, fileContents);
  console.log(`Wrote ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
