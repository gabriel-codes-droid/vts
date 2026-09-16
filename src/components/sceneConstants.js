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
// Hop path now runs along the ISS module's actual lower/exterior surface
// (measured world Y ≈ -2.2, module spans Z from about -8.9 to 6.9) instead
// of separate floating cube platforms. Starts near where he wakes (close to
// MECH_SLEEP_POSITION's Z of 5.5, just outside/below the interior sleep
// spot) and progresses along the belly toward the far end, ending at the
// launch point.
export const HOP_WAYPOINTS = [
  [-1.0, -2.2, 4.0],
  [-0.3, -2.2, 0.0],
  [0.5, -2.2, -4.5],
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
  MOON_CENTER[1] + MOON_RADIUS * 0.95,
  MOON_CENTER[2] + MOON_RADIUS * 0.65,
];

// Planet row sits just above the moon surface. Spacing wide enough for
// the actual GLB models (0.7-0.9 radius) to not overlap.
export const PLANET_ROW_Y = MOON_CENTER[1] + MOON_RADIUS + 1.0;
export const PLANET_ROW_Z = MOON_CENTER[2] - 1.8;
export const PLANET_ROW_SPACING = 2.2;

// Opening scene: the mech sleeps inside the middle of a real ISS module
// scan (international_space_station_-_3d_scan_-_module.glb), replacing the
// earlier crash-site-ground approach that kept fighting oversized backdrop
// planes and box-scaling bugs. This model is clean by comparison: measured
// directly at 4.59 x 4.99 x 15.88 units, centered near its own origin
// (-0.11, 0.02, 0.67) with no weird offset or giant hidden geometry.
// Positioned close to the first hop platform (not centered on the origin)
// so waking into the cube field afterward isn't a big jump.
export const MODULE_WORLD_POSITION = [-1.0, 0.3, -1.0];
// The model's own measured bounding-box center, used to recenter it so
// MODULE_WORLD_POSITION actually lands on its true middle, not its
// arbitrary local origin.
export const MODULE_LOCAL_CENTER = [-0.11, 0.02, 0.67];
// The mech sleeps on the inner lower surface (interior floor) of the module,
// at the -Z end (opposite the hop/waypoint end at +Z). Y = -1.9 lands on
// the interior floor without phasing through the hull exterior at y ≈ -2.2.
export const MECH_SLEEP_POSITION = [-1.0, -1.9, -8.2];

// Halo wreckage used as distant scattered debris, not the ground itself —
// positioned well off to the side and back so its detail (the reason it's
// 106MB) isn't something every visitor pays for without ever seeing it up
// close. Single instance, deliberately not repeated given the file size.
export const DEBRIS_POSITION = [13, -4, -26];
export const DEBRIS_WIDTH = 16;
