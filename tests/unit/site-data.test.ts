// site.ts imports Astro-shaped data that plain Vitest does not need to execute.
// Assert the public-content contract directly against the source text instead.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';

const src = readFileSync('src/data/site.ts', 'utf8');
const heroSource = readFileSync('src/components/HeroShowcase.astro', 'utf8');
const navSource = readFileSync('src/components/Nav.astro', 'utf8');
const homeSource = readFileSync('src/pages/index.astro', 'utf8');
const workVisualSource = readFileSync('src/components/WorkVisual.astro', 'utf8');
const footerSource = readFileSync('src/components/Footer.astro', 'utf8');
const aboutSource = readFileSync('src/pages/about.astro', 'utf8');
const roamWorkSamplesSource = readFileSync('src/components/RoamWorkSamples.astro', 'utf8');
const archiveSource = readFileSync('src/components/ArchiveList.astro', 'utf8');
const globalSource = readFileSync('src/styles/global.css', 'utf8');
const tokenSource = readFileSync('src/styles/tokens.css', 'utf8');
const readmeSource = readFileSync('README.md', 'utf8');
const ogSource = readFileSync('public/og-image.svg', 'utf8');
const deploySource = readFileSync('.github/workflows/deploy.yml', 'utf8');
const layoutSource = readFileSync('src/layouts/Base.astro', 'utf8');

const block = (start: string, end: string) => src.slice(src.indexOf(start), src.indexOf(end));
const selectedWorkBlock = block('export const selectedWork', 'export const experience');
const experienceBlock = block('export const experience', 'export const education');
const archiveBlock = block('export const projectArchive', 'export const about');

test('surface radii stay Apple-like without turning cards into capsules', () => {
  expect(tokenSource).toContain('--radius-xl: 2rem');
  expect(tokenSource).toContain('--radius-lg: 1.5rem');
  expect(tokenSource).not.toContain('6.25rem');
  expect(aboutSource).toContain('border-radius: var(--radius-xl)');
  expect(readmeSource).toContain('restrained 32px Apple-like corner');
  expect(readmeSource).toContain('Nested cards use `--radius-lg` (24px)');
});

test('the site remains light-only regardless of saved or system theme preferences', () => {
  for (const source of [tokenSource, layoutSource, navSource, heroSource, homeSource, aboutSource]) {
    expect(source).not.toContain('data-theme');
    expect(source).not.toContain('prefers-color-scheme: dark');
  }

  expect(layoutSource).not.toContain("localStorage.getItem('theme')");
  expect(layoutSource).toContain('<meta name="color-scheme" content="light" />');
  expect(layoutSource.match(/<meta name="theme-color"/g) ?? []).toHaveLength(1);
  expect(layoutSource).toContain('<meta name="theme-color" content="#F7F3ED" />');
  expect(tokenSource).toContain('color-scheme: only light');
  expect(navSource).not.toContain('mark-white');
  expect(readmeSource).toContain('color system is intentionally light-only');
});

test('S3 deployment publishes Astro pages at clean extensionless routes', () => {
  expect(deploySource).toContain('find dist -mindepth 2 -name index.html -print0');
  expect(deploySource).toContain('--key "$route"');
  expect(deploySource).toContain('--key "$route/"');
  expect(deploySource).toContain('--content-type "text/html; charset=utf-8"');
  expect(layoutSource).toContain("Astro.url.pathname.replace(/\\/+$/, '')");
});

test('selected work balances three professional chapters with three independent products', () => {
  expect((selectedWorkBlock.match(/title:/g) ?? [])).toHaveLength(6);
  expect((selectedWorkBlock.match(/href:/g) ?? [])).toHaveLength(6);
  expect((selectedWorkBlock.match(/size: 'feature'/g) ?? [])).toHaveLength(3);
  expect((selectedWorkBlock.match(/size: 'compact'/g) ?? [])).toHaveLength(3);
  expect((selectedWorkBlock.match(/group: 'work'/g) ?? [])).toHaveLength(3);
  expect((selectedWorkBlock.match(/group: 'project'/g) ?? [])).toHaveLength(3);
  expect((selectedWorkBlock.match(/company:/g) ?? [])).toHaveLength(3);
  expect((selectedWorkBlock.match(/focus:/g) ?? [])).toHaveLength(3);
  expect((selectedWorkBlock.match(/date:/g) ?? [])).toHaveLength(3);

  for (const title of [
    'Product engineering at Roam',
    'Alive Still',
    'Developer platform at Procore',
    'Chicks of NYC',
    'Citi Bike Wrapped',
    'Release tools at Workday',
  ]) {
    expect(selectedWorkBlock).toContain(`title: '${title}'`);
  }
});

test('the resume covers all three roles without making Roam the whole story', () => {
  expect((experienceBlock.match(/company:/g) ?? [])).toHaveLength(3);
  expect(experienceBlock).toContain("company: 'Roam'");
  expect(experienceBlock).toContain("company: 'Procore'");
  expect(experienceBlock).toContain("company: 'Workday'");
  expect(experienceBlock).toContain('600+ person engineering organization');
  expect(experienceBlock).toContain('more than 80 teams');
  expect(experienceBlock).toContain('about three hours a week');
  expect(experienceBlock).toContain("href: 'https://www.withroam.com'");
  expect(experienceBlock).toContain('Fifth Wall co-founder Brendan Wallace');
  expect(experienceBlock).toContain("label: '01 · Product engineering'");
  expect(experienceBlock).toContain("title: 'Roam marketplace'");
  expect(experienceBlock).toContain("label: '02 · AI product & systems'");
  expect(experienceBlock).toContain("title: 'Reed, the AI realtor'");
  expect(experienceBlock).toContain('one of two lead engineers building Reed');
  expect(experienceBlock).toContain('internal agent harness our team uses to plan, dispatch, and supervise parallel coding agents');
  expect(experienceBlock).toContain('Associate DevOps / Release Engineer → Senior Associate Developer');
});

test('the public project archive contains seven live, intentional projects', () => {
  expect((archiveBlock.match(/title:/g) ?? [])).toHaveLength(7);
  expect((archiveBlock.match(/href: 'https:\/\//g) ?? [])).toHaveLength(7);

  for (const project of ['Alive Still', 'Chicks of NYC', 'Citi Bike Wrapped', 'wimdy', 'Roast My Friend', 'Photo archive', 'blumblumblum']) {
    expect(archiveBlock).toContain(`title: '${project}'`);
  }

  expect(archiveBlock).not.toContain('Flâneur');
  expect(archiveBlock).not.toContain('Poker Night');
});

test('banned, stale, and tech-bro claims are absent', () => {
  for (const phrase of [
    'mission-control',
    'trackthatpoop',
    'jordans-jams',
    'ShipSwift',
    'dondachi',
    'AI-native',
    'fleet of agents',
    'unreasonable rigor',
    'merge velocity',
    '419 PRs',
  ]) {
    expect(src).not.toContain(phrase);
  }
});

test('public resume facts stay aligned with the canonical resume', () => {
  expect(src).toContain('Studio Art minor');
  expect(src).not.toContain('two majors');
  expect(src).toContain('mailto:jordanblum16@gmail.com');
  expect(src.toLowerCase()).toContain('eight years');
});

test('about keeps experience prominent and removes the awkward taxonomy', () => {
  expect(src).toContain('I like making things. I like making them look good, too.');
  expect(aboutSource).toContain('<h2 id="experience-heading">Experience</h2>');
  expect(aboutSource).toContain('Things I’ve worked with');
  expect(aboutSource).not.toContain('<figcaption');
  expect(aboutSource).not.toContain('Capabilities');
  expect(aboutSource).not.toContain('education-section');
  expect(aboutSource).not.toContain('<p class="eyebrow">About</p>');
  expect(aboutSource).not.toContain('<p class="section-kicker serif">work</p>');
  expect(aboutSource).not.toContain('<p class="section-kicker serif">projects</p>');
  expect(src).not.toContain('which is probably why');
  expect(archiveSource).not.toContain('Kind');
  expect(archiveSource).not.toContain('archive-context');
  expect(aboutSource).toContain('<h3 class="role">{item.role}</h3>');
  expect(aboutSource).not.toContain('class="company-title"');
});

test('homepage quick facts and interaction copy stay concise', () => {
  expect(heroSource).toContain('class="profile-facts"');
  expect(heroSource).toContain('Product engineer at');
  expect(heroSource).not.toContain('Consumer products · AI agents');
  expect(heroSource).not.toContain('move your cursor');
  expect(src).not.toContain('Currently at Roam.');
  expect(navSource).toContain('data-nav-mark');
  expect(navSource).toContain('data-scrolling');
  expect(navSource).toContain('nextUpright + direction * 720');
  expect(navSource).not.toContain('Math.min(1125');
});

test('the redesign uses Jordan and project-owned imagery', () => {
  expect(heroSource).toContain("../assets/identity/jordan-portrait-blue.png");
  expect(navSource).toContain('jrb-logo-red.png');
  expect(navSource).toContain('jrb-logo-blue.png');
  expect(aboutSource).toContain('/company/scu-broncos.svg');
  expect(aboutSource).toContain('campusRoleDate');
  expect(homeSource).toContain('blum-collage.png');
  expect(homeSource).toContain('blum-tag-logo.png');
  expect(homeSource).toContain('widths={[320, 480, 640, 960, 1280]}');
  for (const asset of [
    'alive-home.png',
    'alive-trip.png',
    'alive-activity.png',
    'chicks-logo.png',
    'citibike-wrapped.webp',
  ]) {
    expect(workVisualSource).toContain(asset);
  }

  for (const stock of ['sunset-beach', 'portfolio-3', 'cali-mountains', 'chicago-skyline']) {
    expect(heroSource).not.toContain(stock);
    expect(workVisualSource).not.toContain(stock);
  }
});

test('Roam experience media uses public product screens and a sanitized harness demo', () => {
  expect(aboutSource).toContain("item.company === 'Roam' && <RoamWorkSamples />");
  expect(roamWorkSamplesSource).toContain('<details class="experience-media" data-roam-samples>');
  expect(roamWorkSamplesSource).toContain('<summary class="experience-media-summary">');
  expect(roamWorkSamplesSource.match(/<details[^>]*>/)?.[0]).not.toMatch(/\sopen(?:\s|=|>)/);
  expect(roamWorkSamplesSource).toContain('Selected work from Roam');
  expect(roamWorkSamplesSource).toContain('View 6 screens');
  expect(roamWorkSamplesSource).toContain('roam-marketplace.jpg');
  expect(roamWorkSamplesSource).toContain('roam-listing.jpg');
  expect(roamWorkSamplesSource).toContain('reed-home.jpg');
  expect(roamWorkSamplesSource).toContain('reed-chat.jpg');
  expect(roamWorkSamplesSource).toContain('agent-harness-chat.png');
  expect(roamWorkSamplesSource).toContain('agent-harness-subagents.png');
  expect(roamWorkSamplesSource).toContain('synthetic demo data');
  expect(roamWorkSamplesSource).not.toContain('withroam/roam');
  expect(roamWorkSamplesSource).not.toMatch(/<a(?:\s|>)/);
  expect(roamWorkSamplesSource).not.toMatch(/https?:\/\//);
  expect(roamWorkSamplesSource).not.toMatch(/PR #?\d+/);

  const harnessChatScreenshot = readFileSync('src/assets/experience/agent-harness-chat.png');
  const reviewedChatHash = createHash('sha256').update(harnessChatScreenshot).digest('hex');
  expect(reviewedChatHash).toBe('c90c191f7be9d612bfff2d2395a18c0ed3b8844780c1e6cc2cd63c9dfccdf182');

  const harnessSubagentsScreenshot = readFileSync('src/assets/experience/agent-harness-subagents.png');
  const reviewedSubagentsHash = createHash('sha256').update(harnessSubagentsScreenshot).digest('hex');
  expect(reviewedSubagentsHash).toBe('9d0db76b03373a79b3d04cde17e7d736db1e08679c17d2e36f187bfdb76e9ad1');
});

test('editorial labels and retired footer clutter stay removed', () => {
  for (const phrase of [
    'Illustrative internal tool',
    'Illustrative product surface',
    'Actual app screens',
    'Actual project artwork',
  ]) {
    expect(workVisualSource).not.toContain(phrase);
  }

  expect(homeSource).toContain('<ArchiveList items={projectArchive} compact />');
  expect(homeSource).not.toContain('class="section-kicker">Archive');
  expect(archiveSource).not.toContain('<thead>');
  expect(homeSource).not.toContain('old internet corner');
  expect(footerSource).toContain('Want to chat?');
  expect(footerSource).not.toContain('Get in touch');
  expect(footerSource).not.toContain('Astro · Switzer · Fraunces');
  expect(globalSource).toMatch(/h1,\s*h2,\s*h3,\s*h4,\s*p/);
  expect(ogSource).not.toContain('JRB / 02');
  expect(ogSource).not.toContain('Useful is a wide');
  expect(ogSource).toContain('Consumer products, developer tools,');
});
