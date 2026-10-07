// The heroes who guard the planet. They all play the same; the difference is
// looks and the colour of their laser. Some open up as stars are collected.
// Dino is drawn from its picture layers (render/dragon.js); the others from
// shapes (render/pals.js), using the colours here.

export const HEROES = [
  { id: 'dino', name: 'Dino', stars: 0, beam: [120, 230, 255] },
  { id: 'bunny', name: 'Bunny', stars: 0, beam: [255, 130, 180], ears: 'long', fur: '#FFFFFF', fur2: '#F1E6EE', inner: '#FFB3C7', muzzle: '#FFFFFF', shirt: '#FF6F9C', shirt2: '#E04679' },
  { id: 'bear', name: 'Bear', stars: 0, beam: [255, 190, 70], ears: 'round', fur: '#B97A4E', fur2: '#9B5F38', inner: '#E9B98F', muzzle: '#F2D3B3', shirt: '#4C8DFF', shirt2: '#2F67D6' },
  { id: 'panda', name: 'Panda', stars: 9, beam: [140, 230, 90], ears: 'round', fur: '#FFFFFF', fur2: '#E8E8EE', inner: '#2B2B3A', earFur: '#2B2B3A', patches: '#2B2B3A', muzzle: '#FFFFFF', shirt: '#8BD346', shirt2: '#62A82A' },
  { id: 'fox', name: 'Fox', stars: 20, beam: [255, 140, 60], ears: 'point', fur: '#FF8B3D', fur2: '#E5692A', inner: '#5A2E1E', muzzle: '#FFF3E4', shirt: '#2EC4B6', shirt2: '#1A9B90' },
  { id: 'kitty', name: 'Kitty', stars: 35, beam: [190, 140, 255], ears: 'point', fur: '#B9B1D9', fur2: '#9A90C4', inner: '#FFB8CF', muzzle: '#F4F0FF', stripes: '#8F84BE', shirt: '#A46CF5', shirt2: '#7D44D6' },
  { id: 'frog', name: 'Frog', stars: 50, beam: [200, 255, 80], ears: 'frog', fur: '#7DD35F', fur2: '#57B03B', inner: '#FFFFFF', muzzle: '#B9EE8F', shirt: '#FFC93C', shirt2: '#E8A10C' }
];

export const heroById = id => HEROES.find(h => h.id === id) || HEROES[0];
export const starTotal = stars => Object.values(stars).reduce((a, b) => a + b, 0);
export const heroOpen = (hero, stars) => starTotal(stars) >= hero.stars;
