import { studio } from './studio';

export const iosApps = [
  {
    id: 'stamp-shift',
    title: 'Stamp Shift',
    description: 'Sort stamps into one perfect order.',
    tone: 'stamp',
    alt: 'Stamp Shift’s real Route 20 stamp puzzle on an iPhone.',
    storeUrl: 'https://apps.apple.com/us/app/stamp-shift/id6824269145',
    website: 'https://buildwithblum.com/apps/stamp-shift',
    supportUrl: '/apps/stamp-shift/support',
    privacyUrl: '/apps/stamp-shift/privacy',
  },
  {
    id: 'alive-still',
    title: 'Alive Still',
    description: 'A daily safety check-in for people who live alone.',
    tone: 'alive',
    alt: 'Alive Still’s daily safety check-in screen on an iPhone.',
    storeUrl: 'https://apps.apple.com/us/app/alive-still/id6757885591',
    website: 'https://alivestill.app',
    supportUrl: `mailto:${studio.supportEmail}?subject=alive-still%20support`,
    privacyUrl: 'https://alivestill.app/privacy',
  },
  {
    id: 'birthday',
    title: 'Birthday',
    description: 'Birthdays, reminders and thoughtful gift ideas.',
    tone: 'birthday',
    alt: 'Birthday’s upcoming birthdays screen on an iPhone, with fictional sample contacts.',
    storeUrl: 'https://apps.apple.com/us/app/id6809536251',
    website: 'https://trybirthday.com',
    supportUrl: `mailto:${studio.supportEmail}?subject=birthday%20support`,
    privacyUrl: 'https://trybirthday.com/privacy.html',
  },
] as const;

export const iosAppsSummary = `${new Intl.ListFormat('en', { type: 'conjunction' }).format(iosApps.map(app => app.title))}.`;
