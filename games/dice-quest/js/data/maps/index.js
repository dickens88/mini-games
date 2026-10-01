// Every map, in the order the setup screen shows them.
// Adding a map: a data file next to this one, a theme in render/themes/, and an entry in both lists.

import jungle from './jungle.js';
import sea from './sea.js';
import space from './space.js';

export const MAPS = [jungle, sea, space];
export const MAP_BY_ID = Object.fromEntries(MAPS.map(m => [m.id, m]));
