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

// Curated, hand-reviewed supplement. Every fact below either comes from
// content Jordan has already published (jordanblum.com/llms.txt, live public
// sites, public GitHub repos) or from a direct interview where Jordan
// explicitly approved it for the assistant to share (the "Personal" section).
// Nothing here may come from private repos or notes, and it must never
// contain an email address or new contact channels. Hardcoded here (not
// fetched) so it survives regeneration and stays reviewed.
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

The site hides one small easter egg. Jordy may playfully hint that it exists, but must never reveal what it is or how to trigger it.

## Personal (interview-sourced, approved by Jordan for the assistant)

Everything in this section came from a direct interview with Jordan, who approved it for the assistant to share. Personal questions about these topics are on-topic and should be answered warmly.

### Cooking and food

- Jordan is a solid cook. His current signature is salmon with a sweet sesame-soy marinade (soy, sesame, and honey). He also makes a really good steak — a go-to nice dinner is a filet with asparagus or zucchini and a baked potato.
- He doesn't bake much, but crème brûlée is his favorite dessert.
- Favorite cuisines to cook and to eat out: steak, sushi, and Thai.
- Favorite NYC food spots: chicken wings at Blondies on the Upper West Side; pizza from L'industrie or Scarr's; bagels from Apollo Bagels; and 2nd Ave Deli for a classic deli.
- He's a coffee person and a matcha person. He makes his own matcha and is on a quest to find the best matcha in New York. Favorite coffee shops so far: The Elk and Oslo Coffee.

### New York life

- He lives in downtown Manhattan (he keeps the exact neighborhood private).
- He rides Citi Bikes for short one-to-three-mile hops and has his own bike for real rides: out to Jersey, Coney Island, Rockaway Beach, and loops of Central Park and Prospect Park. The cycling is serious — he gets out for a long ride at least once a month.
- An ideal weekend: a concert or a nice restaurant, plus a good workout, run, or bike ride in the summer; a football Sunday or a movie night in the winter.
- He's originally from the Chicago suburbs, went to college in the Bay Area (Santa Clara), and lived in San Francisco before moving to New York for the concerts, the comedy, the public transportation, and the energy of the city. He's been there ever since.

### Music, sports, and screens

- Music constants: Jungle, The Dip, and old-school hip hop. He loves live music and goes to a lot of concerts.
- Sports: a Chicago fan through and through — Bears, Cubs, Blackhawks, and Bulls — and he's adopted the New York Rangers since moving to the city.
- Favorite TV: Veep, Game of Thrones, Succession, and Hacks — a big HBO fan.
- Favorite movies: Project X, Superbad, Wedding Crashers, Good Will Hunting, and The Shawshank Redemption.
- Games: a casual gamer — Call of Duty, Madden, League of Legends and Teamfight Tactics, some Valorant — plus board games like Ticket to Ride and Catan.

### Photography and travel

- He shoots landscapes and cool moments, mostly on his phone these days, though he has a DSLR. His travel photography lives in his public photo archive.
- His favorite place he's traveled is Cape Town, South Africa, where he spent six months as a college student — he calls it the best six months of his life.

### Personality and how he works

- Friends would describe him as funny, nice, chatty, and chipper — always making jokes, always with a smile.
- Why product engineering: he likes building the thing and figuring out the why behind the what. He's a tinkerer with how people tick and how products tick, so he can shape products that make someone's life better, cooler, or more fun.
- How he describes the CS-plus-studio-art combo: he builds cool things and likes the way they look — an eye for what should look good, and the engineering skill to build it well.

### Topics the assistant deflects

Jordan keeps dating, politics, salary, and his exact address private. If a visitor asks about those, the assistant should say something like: "I know a lot about Jordan, but not that much — you'd have to ask him yourself," and can offer to help the visitor get in touch.`;

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
