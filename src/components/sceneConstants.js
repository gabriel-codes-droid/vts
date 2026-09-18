// Single source of truth for the hop-platform cubes, the moon, and the
// planet gallery.
//
// The opening module is oriented as a horizontal corridor. The mech starts
// on the lower floor near the open +Z end, then takes one short hop through
// the hatch before continuing across the cube route. Keeping that first hop
// outside the module prevents the wake-up pose from having to cross the
// interior geometry.

export const HOP_CUBE_SIZE = 0.8;
// The first waypoint is the sleep pose. The second is just beyond the hatch,
// so waking hands straight into the first visible cube instead of sending the
// mech back through the module. The remaining waypoints pull the route away
// from the moon before launch, which keeps the opening and planet scenes from
// intersecting.
export const HOP_WAYPOINTS = [
  [0.0, -1.23645, 5.7],
  [2.8, -2.4, 8.5],
  [-2.4, -4.3, 10.5],
  [3.0, -6.2, 12.5],
];
export const HOP_CUBE_POSITIONS = HOP_WAYPOINTS.slice(1);
export const HOP_CUBES = HOP_CUBE_POSITIONS.map((point) => [
  point[0],
  point[1] - HOP_CUBE_SIZE / 2,
  point[2],
]);

export const LAUNCH_POINT = HOP_WAYPOINTS[HOP_WAYPOINTS.length - 1];
export const FLIGHT_APEX = [LAUNCH_POINT[0], LAUNCH_POINT[1] + 6.5, LAUNCH_POINT[2]];

// Moon pushed way below the cubes — real separation from the cube scene.
export const MOON_CENTER = [0, -18, -8];
// Broader foreground for the final landing while keeping the authored center
// and the planet row direction unchanged.
export const MOON_RADIUS = 6.8;
export const MOON_SEAT_POSITION = [
  MOON_CENTER[0],
  // Downward raycast through the normalized moon.glb at its center X/Z.
  // This scan's surface is lower than its longest-axis bounding radius.
  MOON_CENTER[1] + MOON_RADIUS * 0.596579511855,
  MOON_CENTER[2],
];

// Planet row sits just above the moon surface. Spacing wide enough for
// the actual GLB models (0.7-0.9 radius) to not overlap.
export const PLANET_ROW_Y = MOON_CENTER[1] + MOON_RADIUS + 1.5;
export const PLANET_ROW_Z = MOON_CENTER[2] - 3.0;
export const PLANET_ROW_SPACING = 3.0;

// Opening scene: the mech sleeps inside the real ISS module scan
// (international_space_station_-_3d_scan_-_module.glb). The source asset is
// Z-up, so SleepModule rotates it into a horizontal corridor before placing
// it here. The opening is the +Z end; the sleep pose sits just inside that
// hatch and the first hop is immediately outside it.
export const MODULE_WORLD_POSITION = [0, 0.3, -1.0];
// The model's own measured bounding-box center, used to recenter it so
// MODULE_WORLD_POSITION actually lands on its true middle, not its
// arbitrary local origin.
export const MODULE_LOCAL_CENTER = [-0.11, 0.02, 0.67];
// The mech sleeps on the inner lower surface, slightly right of center and
// close to the open +Z hatch. This leaves a short, straight hand-off to the
// first cube while keeping the body fully inside the corridor.
export const MECH_SLEEP_POSITION = HOP_WAYPOINTS[0];

// Halo wreckage used as distant scattered debris, not the ground itself —
// positioned well off to the side and back so its detail (the reason it's
// 106MB) isn't something every visitor pays for without ever seeing it up
// close. Single instance, deliberately not repeated given the file size.
export const DEBRIS_POSITION = [13, -4, -26];
export const DEBRIS_WIDTH = 16;
