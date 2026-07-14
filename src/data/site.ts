import type { ImageMetadata } from 'astro';
import cali from '../assets/photos/cali-mountains.jpeg';
import chicago from '../assets/photos/chicago-skyline-night.jpg';
import morro from '../assets/photos/sunset-beach.jpeg';
import namibia from '../assets/photos/photo0030.jpg';
import lake from '../assets/photos/moutain-lake.jpeg';
import cpt from '../assets/photos/CPT_Sunset.jpg';
import holeinthewall from '../assets/photos/holeinthewall.jpg';
import capetownCave from '../assets/photos/photo0020.jpg';
import thailand from '../assets/photos/beach-water.jpg';
import rome from '../assets/photos/photo0040.jpg';
import cityViews from '../assets/photos/portfolio-3.jpg';
import tableMountain from '../assets/photos/photo0001.jpg';

export interface Print { src: ImageMetadata; alt: string; label: string }
export interface RowItem { title: string; meta: string; date: string; blurb: string; href?: string; thumb?: ImageMetadata }

export const hero = {
  statement: 'Product engineer at Roam. I like making software — and photographs — feel right.',
  meta: 'New York · currently building Reed',
};

export const heroPrints: Print[] = [
  { src: cali, alt: 'Runner at sunset on California hills', label: 'California' },
  { src: chicago, alt: 'Chicago skyline at dusk', label: 'Chicago' },
  { src: morro, alt: 'Morro Rock sunset with shorebird', label: 'Morro Bay' },
  { src: namibia, alt: 'Deadvlei, Namibia — dead trees on white clay pan', label: 'Namibia' },
  { src: lake, alt: 'Mountain lake with yellow canoe', label: 'Mountain lake' },
  { src: cpt, alt: 'Ocean sunset from Cape Town cliffs', label: 'Cape Town' },
];

export const facedownPrint: Print = {
  src: holeinthewall, alt: 'Hole in the Wall, Wild Coast, South Africa', label: 'Wild Coast — a keeper',
};

export const storyBeats = [
  { sentence: 'I joined Roam in 2025 as engineer #3 — full-stack product on the marketplace making assumable mortgages accessible.', visual: 'listing' },
  { sentence: 'I shipped the buyer funnel end to end: offer calculators, search, onboarding, the growth experiments.', visual: 'calc' },
  { sentence: 'Then Roam built an AI realtor — Reed — and I became its lead engineer.', visual: 'chat' },
  { sentence: 'Now I ship alongside a fleet of agents I built the harness for — with evals to keep it honest.', visual: 'metrics' },
] as const;

export const metrics = ['419 PRs/yr', '3–4× merge velocity', '13× completion lift', '87%+ eval positivity'];

export const experience: RowItem[] = [
  { title: 'Roam', meta: 'Product Engineer · #3', date: '2025—', blurb: 'The marketplace, then lead engineer on Reed, Roam's AI realtor.', href: 'https://www.withroam.com' },
  { title: 'Procore', meta: 'Senior Software Engineer', date: '2021–2025', blurb: 'Developer productivity for 300+ engineers — the internal deploy platform, CI/CD standards adopted org-wide.' },
  { title: 'Workday', meta: 'DevOps & Release Engineering', date: '2018–2021', blurb: 'Internal developer tools; cut release timelines in half.' },
  { title: 'Santa Clara University', meta: 'B.S. Computer Science · Studio Art', date: '2014–2018', blurb: 'Plus a semester at the University of Cape Town, Fall 2016.' },
];

export const projects: RowItem[] = [
  { title: 'chicksofnyc', meta: 'Next.js · Airtable · Maps', date: '2025', blurb: 'NYC's chicken wings, reviewed in person, ranked, and mapped.', href: 'https://chicksofnyc.com', thumb: cityViews },
  { title: 'citibike wrapped', meta: 'React · client-side only', date: '2026', blurb: 'A Spotify-Wrapped year in review for your Citi Bike rides.', href: 'https://citibikewrapped.vercel.app', thumb: chicago },
  { title: 'Alive Still', meta: 'SwiftUI · Twilio', date: '2026', blurb: 'Daily check-in app for people who live alone — a missed window texts your people.', href: 'https://alivestill.app', thumb: lake },
  { title: 'wimdy', meta: 'Weather · activities', date: '2026', blurb: 'Your weather, judged: what's actually worth doing outside right now.', href: 'https://wimdy.io', thumb: thailand },
  { title: 'reservation agent', meta: 'Agents · whimsy', date: '2026', blurb: 'An agent that hunts down reservations of all kinds.', href: 'https://reservation-agent.vercel.app', thumb: rome },
  { title: 'roast my friend', meta: 'LLMs · questionable ideas', date: '2026', blurb: 'Upload a friend, receive a roast.', href: 'https://roastmyfriend.vercel.app', thumb: capetownCave },
  { title: 'poker night', meta: 'Settling up', date: '2025', blurb: 'Compute poker-night wins and settle up without the spreadsheet fight.', href: 'https://poker-night-eight.vercel.app', thumb: tableMountain },
];

export const contactSheet: Print[] = [
  { src: cali, alt: 'Runner at sunset on California hills', label: 'California' },
  { src: capetownCave, alt: 'Silhouette in rock cave overlooking Cape Town', label: 'Cape Town' },
  { src: thailand, alt: 'Turquoise bay with limestone cliffs', label: 'Thailand' },
  { src: namibia, alt: 'Deadvlei, Namibia — dead trees on white clay pan', label: 'Namibia' },
  { src: rome, alt: 'Colosseum cross silhouette, Rome', label: 'Rome' },
  { src: tableMountain, alt: 'Hikers overlooking Cape Town from Table Mountain', label: 'Table Mountain' },
  { src: morro, alt: 'Morro Rock sunset with shorebird', label: 'Morro Bay' },
  { src: holeinthewall, alt: 'Hole in the Wall, Wild Coast, South Africa', label: 'Wild Coast' },
];

export const gallery = 'https://blumblumblum-gallery.vercel.app/';

export const social = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/jordanblum1' },
  { label: 'GitHub', href: 'https://github.com/jordanblum1' },
  { label: 'Instagram', href: 'https://www.instagram.com/jordanblum1' },
  { label: 'Photo gallery', href: 'https://blumblumblum-gallery.vercel.app/' },
  { label: 'Email', href: 'mailto:jordanblum19@gmail.com' },
];
