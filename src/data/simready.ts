export const concepts = [
  {
    id: 'dispatch', number: '01', title: 'Dispatch',
    description: 'A conveyor in motion. Switch routes to change its orientation.',
    asset: 'conveyor_belt_a02/simready_usd/sm_conveyor_belt_a02_01.usd',
  },
  {
    id: 'working-set', number: '02', title: 'Working Set',
    description: 'Pull the chair apart: input, attention, revision.',
    asset: 'chair_office_amf_black_a01/simready_usd/sm_chair_office_amf_black_a01_01.usd',
  },
  {
    id: 'counter-study', number: '03', title: 'Counter Study',
    description: 'Move the cup. Shift the light.',
    asset: 'food_beverage_coffeeCup_a01/simready_usd/sm_food_beverage_coffeeCup_a01_01.usd',
  },
] as const;

export type ConceptId = typeof concepts[number]['id'];
export const revision = '524747d9b5e1f21b5b18b56041788c01d745f1a1';
export const source = `https://huggingface.co/datasets/nvidia/simready-assets/tree/${revision}`;
export const assetUrl = (asset: string): string => `https://huggingface.co/datasets/nvidia/simready-assets/resolve/${revision}/${asset}`;
