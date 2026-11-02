export const stampShiftAppStoreUrl = 'https://apps.apple.com/us/app/stamp-shift/id6824269145';

export function getStampShiftDownloadUrl(search: string): string {
  try {
    if (!decodeURIComponent(search)) return stampShiftAppStoreUrl;
  } catch {
    return stampShiftAppStoreUrl;
  }

  const campaigns = new URLSearchParams(search).getAll('ss_campaign');
  if (campaigns.length !== 1) return stampShiftAppStoreUrl;

  switch (campaigns[0]) {
    case 'route20-a':
      return 'https://apps.apple.com/app/apple-store/id6824269145?pt=127568836&ct=ss_meta_r20_a_202611&mt=8';
    case 'route20-b':
      return 'https://apps.apple.com/app/apple-store/id6824269145?pt=127568836&ct=ss_meta_r20_b_202611&mt=8';
    default:
      return stampShiftAppStoreUrl;
  }
}
