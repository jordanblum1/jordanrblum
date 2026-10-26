const sprayCan = 'paint_container_spraycan_a01/simready_usd/sm_paint_container_spraycan_a01_01.usd';

export const concepts = [
  { id: 'workbench', title: 'Workbench', description: 'Pairs Jordan’s homepage headline with an MTN-inspired can on the BLUM workbench.', asset: sprayCan },
  { id: 'hero-accent', title: 'Hero Accent', description: 'Adds the can as a small foreground detail while Jordan’s portrait stays primary.', asset: sprayCan },
  { id: 'about-signature', title: 'About Signature', description: 'Adds the can to the existing collage as a quiet studio signature.', asset: sprayCan },
] as const;

export type ConceptId = typeof concepts[number]['id'];
export const revision = '524747d9b5e1f21b5b18b56041788c01d745f1a1';
export const source = `https://huggingface.co/datasets/nvidia/simready-assets/tree/${revision}`;
export const assetUrl = (asset: string): string => `https://huggingface.co/datasets/nvidia/simready-assets/resolve/${revision}/${asset}`;
