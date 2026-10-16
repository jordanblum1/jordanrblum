import { social } from './site';

export interface AppDocumentation {
  slug: string;
  name: string;
  platform: string;
  description: string;
}

const emailContact = social.find((contact) => contact.label === 'Email');
if (!emailContact) throw new Error('App documentation requires the site Email contact.');

export const supportEmail = emailContact.href.replace(/^mailto:/, '');
export const stampShift: AppDocumentation = {
  slug: 'stamp-shift',
  name: 'Stamp Shift',
  platform: 'iPhone puzzle',
  description: 'Match three queues of stamps to one delivery order, with a pocket and a single reversal.',
};

// Add an app only with its own overview, support and privacy pages under /apps/{slug}.
export const apps: readonly AppDocumentation[] = [stampShift];
