import type { ImageMetadata } from 'astro';
import { iosApps } from '../../src/data/ios-apps';
import { iosAppArt } from '../../src/data/ios-app-art';
import chicks from '../../src/assets/projects/peek-chicks.webp';
import citibike from '../../src/assets/projects/citibike-wrapped.webp';
import capeTown from '../../src/assets/photos/photo0020.jpg';
import namibia from '../../src/assets/photos/photo0030.jpg';
import rome from '../../src/assets/photos/photo0040.jpg';
import blum from '../../src/assets/identity/blum-tag-logo.png';

export interface WorkExample {
  title: string;
  description: string;
  image: ImageMetadata;
  treatment: 'phone' | 'website' | 'identity' | 'photo';
  tone: 'stamp' | 'alive' | 'birthday' | 'chicks' | 'bike' | 'blum' | 'photo';
  alt: string;
  href: string;
  action: string;
}

export interface WorkCollection {
  id: string;
  label: string;
  examples: readonly WorkExample[];
}

export const workCollections: readonly WorkCollection[] = [
  {
    id: 'ios-apps', label: 'iOS apps', examples: iosApps.map(app => ({
      ...app, image: iosAppArt[app.id], treatment: 'phone', href: `/apps/${app.id}`, action: `Explore ${app.title}`,
    })),
  },
  {
    id: 'web', label: 'Web', examples: [
      { title: 'Chicks of NYC', description: 'A map and ranking of chicken wings we actually ate.', image: chicks, treatment: 'website', tone: 'chicks', alt: 'Chicks of NYC’s illustrated Brooklyn Bridge and chicken-wing identity.', href: 'https://chicksofnyc.com', action: 'Find your next wings' },
      { title: 'Citi Bike Wrapped', description: 'A personal year in review for your Citi Bike rides.', image: citibike, treatment: 'website', tone: 'bike', alt: 'A Citi Bike Wrapped ride recap.', href: 'https://citibikewrapped.com', action: 'See Citi Bike Wrapped' },
    ],
  },
  {
    id: 'design', label: 'Design', examples: [
      { title: 'Blum', description: 'A personal mark, with a life of its own.', image: blum, treatment: 'identity', tone: 'blum', alt: 'The original hand-drawn Blum wordmark.', href: 'https://blumblumblum.com', action: 'See Blum in use' },
      { title: 'Chicks of NYC', description: 'A New York guide with an appetite.', image: chicks, treatment: 'identity', tone: 'chicks', alt: 'The Chicks of NYC visual identity.', href: 'https://chicksofnyc.com', action: 'See Chicks in use' },
    ],
  },
  {
    id: 'photos', label: 'Photos', examples: [
      { title: 'Cape Town', description: 'South Africa', image: capeTown, treatment: 'photo', tone: 'photo', alt: 'Cape Town from a rocky cave overlook, with the Jordan Blum Photography watermark.', href: 'https://blumblumblum-gallery.vercel.app/', action: 'Open photo archive' },
      { title: 'Deadvlei', description: 'Namibia', image: namibia, treatment: 'photo', tone: 'photo', alt: 'Dark trees on a pale clay pan against Namibia’s red dunes.', href: 'https://blumblumblum-gallery.vercel.app/', action: 'Open photo archive' },
      { title: 'Rome', description: 'Italy', image: rome, treatment: 'photo', tone: 'photo', alt: 'A cross inside Rome’s Colosseum, with the Jordan Blum Photography watermark.', href: 'https://blumblumblum-gallery.vercel.app/', action: 'Open photo archive' },
    ],
  },
];
