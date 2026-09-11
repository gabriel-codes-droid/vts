// Single source of truth for the hop-platform cubes, the moon, and the
// planet gallery.
//
// Vertical layout (top to bottom):
//   cubes (dispersed, y up to ~+5)
//   flight apex (y ~+7, above all cubes)
//   planet row (just above moon, y ~-11)
//   moon (way below, y ~-16, radius 4)
//
// The mech hops across the 3 hop cubes in a straight diagonal, launches
// straight up, dives down facing the planets, and lands/sits on top of
// the moon surface facing the planet row.

export const HOP_CUBE_SIZE = 0.8;
export const HOP_WAYPOINTS = [
  [2.0, 1.0, 0.5],
  [-1.0, -0.2, -0.5],
  [1.2, -1.0, -1.5],
];
export const HOP_CUBES = HOP_WAYPOINTS.map((point) => [
  point[0],
  point[1] - HOP_CUBE_SIZE / 2,
  point[2],
]);

export const LAUNCH_POINT = HOP_WAYPOINTS[HOP_WAYPOINTS.length - 1];
export const FLIGHT_APEX = [LAUNCH_POINT[0], LAUNCH_POINT[1] + 6.5, LAUNCH_POINT[2]];

// Moon pushed way below the cubes — real separation from the cube scene.
export const MOON_CENTER = [0, -16, -14];
export const MOON_RADIUS = 4.0;
// The camera is slightly above and in front of the moon. This upper-front
// surface point is the visible top spot in the landing composition, rather
// than the mathematically hidden back/top pole.
export const MOON_SEAT_POSITION = [
  MOON_CENTER[0],
  MOON_CENTER[1] + MOON_RADIUS * 0.82,
  MOON_CENTER[2] + MOON_RADIUS * 0.57,
];

// Planet row sits just above the moon surface. Spacing wide enough for
// the actual GLB models (0.7-0.9 radius) to not overlap.
export const PLANET_ROW_Y = MOON_CENTER[1] + MOON_RADIUS + 1.0;
export const PLANET_ROW_Z = MOON_CENTER[2] - 1.8;
export const PLANET_ROW_SPACING = 2.2;
