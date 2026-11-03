import { studio } from './studio';

export interface AppDocumentation {
  slug: string;
  name: string;
  platform: string;
  description: string;
}

export const supportEmail = studio.supportEmail;
export const stampShift: AppDocumentation = {
  slug: 'stamp-shift',
  name: 'Stamp Shift',
  platform: 'iPhone puzzle',
  description: 'Match three piles of stamps to one delivery order. Stash a stamp in the Drawer or use one Flip.',
};

// Add an app only with its own overview, support and privacy pages under /apps/{slug}.
export const apps: readonly AppDocumentation[] = [stampShift];
