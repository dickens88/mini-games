// The pals you can play as. They all play the same — the difference is looks.
// Drawing is in render/pals.js; the fields here are colours and ear shapes.

export const PALS = [
  { id: 'bunny', name: 'Bunny', ears: 'long', fur: '#FFFFFF', fur2: '#F1E6EE', inner: '#FFB3C7', muzzle: '#FFFFFF', shirt: '#FF6F9C', shirt2: '#E04679' },
  { id: 'fox', name: 'Fox', ears: 'point', fur: '#FF8B3D', fur2: '#E5692A', inner: '#5A2E1E', muzzle: '#FFF3E4', shirt: '#2EC4B6', shirt2: '#1A9B90' },
  { id: 'bear', name: 'Bear', ears: 'round', fur: '#B97A4E', fur2: '#9B5F38', inner: '#E9B98F', muzzle: '#F2D3B3', shirt: '#4C8DFF', shirt2: '#2F67D6' },
  { id: 'panda', name: 'Panda', ears: 'round', fur: '#FFFFFF', fur2: '#E8E8EE', inner: '#2B2B3A', earFur: '#2B2B3A', patches: '#2B2B3A', muzzle: '#FFFFFF', shirt: '#8BD346', shirt2: '#62A82A' },
  { id: 'frog', name: 'Frog', ears: 'frog', fur: '#7DD35F', fur2: '#57B03B', inner: '#FFFFFF', muzzle: '#B9EE8F', shirt: '#FFC93C', shirt2: '#E8A10C' },
  { id: 'kitty', name: 'Kitty', ears: 'point', fur: '#B9B1D9', fur2: '#9A90C4', inner: '#FFB8CF', muzzle: '#F4F0FF', stripes: '#8F84BE', shirt: '#A46CF5', shirt2: '#7D44D6' }
];

export const palById = id => PALS.find(p => p.id === id) || PALS[0];
