export const VERSION = '0.3.0';
export const PHASE = 3;

// World tiles are 32x32 "world pixels".
export const TILE = 32;

// 2.5D camera. D = perspective distance (smaller = stronger tilt),
// K = vertical squash of the ground (smaller = flatter / more tilted),
// FOCUS_Y = where the player sits on screen (0 top .. 1 bottom).
export const PERSP = { D: 720, K: 0.76, FOCUS_Y: 0.57 };

export const WALK_SPEED = 108;
export const RUN_SPEED = 190;

// How many tiles should be visible (at the player's depth) for each layout.
export const VIEW_TILES = {
  landscape: { w: 17, h: 8.5 },
  portrait: { w: 9, h: 9 },
};

export const AUTOSAVE_SECONDS = 60;
