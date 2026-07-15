import type { ImageMetadata } from 'astro';
import tableMountain from '../assets/photos/photo0001.jpg';
import capetownCave from '../assets/photos/photo0020.jpg';
import namibia from '../assets/photos/photo0030.jpg';
import rome from '../assets/photos/photo0040.jpg';

export interface Print {
  src: ImageMetadata;
  alt: string;
  label: string;
  position?: string;
}

export interface RowItem {
  title: string;
  meta: string;
  date: string;
  blurb: string;
  href?: string;
}

export interface ProjectItem extends RowItem {
  href: string;
  artifact: 'alive' | 'chicks' | 'citibike' | 'flaneur' | 'wimdy' | 'roast' | 'poker';
}

export const hero = {
  eyebrow: 'Jordan Blum · product engineer · New York',
  statement: 'I work on Reed at Roam, and I make a lot of oddly specific things on the side.',
  intro: 'Most days I move between product interfaces, backend systems, and the tools that help an AI agent give a useful answer instead of a confident shrug.',
  status: 'currently: chat, search, agent tools, and evals',
};

export const storyBeats = [
  {
    era: 'May 2025 — Feb 2026',
    title: 'The marketplace',
    sentence: 'I joined Roam as one of four engineers. For the first stretch I worked across the marketplace: offers, search, onboarding, growth experiments, and whatever else needed doing.',
    visual: 'marketplace',
  },
  {
    era: 'Mar 2026 — now',
    title: 'Then Reed became the job',
    sentence: 'Reed is an AI realtor. A messy question might need home search, pricing data, listing photos, or a careful follow-up before it needs an answer.',
    visual: 'agent',
  },
  {
    era: 'Product + systems',
    title: 'The parts people use',
    sentence: 'I have worked on the chat and tool UI, buyer and seller flows, polygon home search, photo analysis, and pricing reports.',
    visual: 'product',
  },
  {
    era: 'Reliability',
    title: 'And the parts that keep it honest',
    sentence: 'I also built evals and conversation analytics that show us when the agent is useful, confused, or quietly stuck so we know what to fix next.',
    visual: 'evals',
  },
] as const;

export const experience: RowItem[] = [
  {
    title: 'Procore',
    meta: 'Senior Software Engineer',
    date: '2021—2025',
    blurb: 'I built deployment and credential tooling used by 300+ engineers, then worked with teams to make new-service setup take hours instead of days.',
  },
  {
    title: 'Workday',
    meta: 'DevOps & Release Engineering',
    date: '2018—2021',
    blurb: 'Internal developer tools and release systems, including a test finder that saved developers about three hours a week.',
  },
  {
    title: 'Santa Clara University',
    meta: 'Computer Science · Studio Art minor',
    date: '2014—2018',
    blurb: 'Plus a semester at the University of Cape Town. Computer science and studio art made more sense together than they looked on paper.',
  },
];

export const projects: ProjectItem[] = [
  {
    title: 'Alive Still',
    meta: 'iPhone app · useful',
    date: '2026',
    blurb: 'A daily safety check-in for people who live alone. Miss the window and it texts the people you chose.',
    href: 'https://alivestill.app',
    artifact: 'alive',
  },
  {
    title: 'Chicks of NYC',
    meta: 'map · rankings · wings',
    date: '2025—',
    blurb: 'A map and ranking of chicken wings we actually ate. The data pipeline is more serious than the premise.',
    href: 'https://chicksofnyc.com',
    artifact: 'chicks',
  },
  {
    title: 'Citi Bike Wrapped',
    meta: 'local data · year in review',
    date: '2026',
    blurb: 'Upload your Citi Bike history and get your year in rides. The file stays on your device.',
    href: 'https://citibikewrapped.vercel.app',
    artifact: 'citibike',
  },
  {
    title: 'Flâneur',
    meta: 'restaurant discovery agent',
    date: '2026',
    blurb: 'For when you have a dinner vibe but not a restaurant in mind. Discovery first, reservation second.',
    href: 'https://reservation-agent.vercel.app',
    artifact: 'flaneur',
  },
  {
    title: 'WIMDY',
    meta: 'weather · activities',
    date: '2026',
    blurb: 'Checks the weather against what you actually want to do outside.',
    href: 'https://wimdy.io',
    artifact: 'wimdy',
  },
  {
    title: 'Roast My Friend',
    meta: 'LLMs · questionable judgment',
    date: '2026',
    blurb: 'Upload a friend and get a roast. A joke that escaped the group chat.',
    href: 'https://roastmyfriend.vercel.app',
    artifact: 'roast',
  },
  {
    title: 'Poker Night',
    meta: 'settling up',
    date: '2025',
    blurb: 'Turns a table full of wins and losses into the fewest possible Venmo payments.',
    href: 'https://poker-night-eight.vercel.app',
    artifact: 'poker',
  },
];

export const about = [
  'I studied computer science and studio art. I still tend to bounce between the part that has to work and the part someone has to look at.',
  'I live in New York. Outside work, I ride Citi Bikes, make small apps, and maintain opinions about chicken wings.',
];

export const contactSheet: Print[] = [
  {
    src: tableMountain,
    alt: 'Five hikers looking over Cape Town from Table Mountain',
    label: 'Table Mountain · 2016',
    position: 'center 35%',
  },
  {
    src: capetownCave,
    alt: 'A silhouette standing inside a cave above Cape Town',
    label: 'Cape Town · 2016',
    position: 'center 35%',
  },
  {
    src: namibia,
    alt: 'Dead camel thorn trees in the pale clay pan at Deadvlei, Namibia',
    label: 'Deadvlei · 2016',
    position: 'center 24%',
  },
  {
    src: rome,
    alt: 'A dark cross silhouetted against the sky inside the Colosseum in Rome',
    label: 'Rome · 2016',
    position: 'center 28%',
  },
];

export const gallery = 'https://blumblumblum-gallery.vercel.app/';

export const social = [
  { label: 'Email', href: 'mailto:jordanblum16@gmail.com' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/jordanblum1' },
  { label: 'GitHub', href: 'https://github.com/jordanblum1' },
  { label: 'Old internet corner', href: 'https://blumblumblum.com' },
  { label: 'Photo gallery', href: gallery },
];
