// Single source of truth for the hop-platform cubes, the moon, and the
// planet gallery. Previously the astronaut's landing target (in
// TacticalAstronaut.jsx), the moon's render position (in
// PlanetShowcase.jsx), and the hop waypoints (in SpaceCanvas.jsx) were each
// a separate hardcoded guess with no connection to one another — the same
// disconnected-constants problem the portfolio-3d reference project's
// moonConstants.ts was written to fix. Importing from here instead means
// "the astronaut's feet land exactly on the moon's actual rendered
// surface" and "the character stands exactly on each hop cube's actual
// top face" are guaranteed by construction, not by hoping two separately
// authored numbers happen to agree.
//
// Vertical placement is deliberately constrained: the camera is still
// fixed (no scroll-driven camera movement yet — separate, larger piece of
// work) and OrbitControls only allows tilting down ~30° from level
// (minPolarAngle = PI/3). Pushing the moon/planets far below the origin
// would put them permanently off-frame, unreachable even at max drag. The
// values below sit low enough to clear the cube field's vertical extent
// (hero cubes ~\u00b12.2, far cubes ~\u00b13.5) while staying within reach of a
// downward drag.

// Hop-platform cubes: the character's feet land exactly on each cube's top
// face, since CUBE_CENTER_Y = waypoint_y - HOP_CUBE_SIZE / 2.
export const HOP_CUBE_SIZE = 1.8;
export const HOP_WAYPOINTS = [
  [-2.1, -0.3, 0.6],
  [-0.7, 0.25, -0.1],
  [0.7, -0.2, -0.6],
  [2.1, 0.3, -1.1],
];
export const HOP_CUBES = HOP_WAYPOINTS.map((point) => [
  point[0],
  point[1] - HOP_CUBE_SIZE / 2,
  point[2],
]);

// Flight path: launches straight up from the last hop cube (a real vertical
// ascent, clearing the cube field's ~2.2-3.5 unit vertical extent) before
// arcing over to the moon seat. Two legs instead of one diagonal lerp, so
// "flies vertically" is literal — the first leg shares X/Z with the launch
// point and only Y changes.
export const LAUNCH_POINT = HOP_WAYPOINTS[HOP_WAYPOINTS.length - 1];
export const FLIGHT_APEX = [LAUNCH_POINT[0], LAUNCH_POINT[1] + 5, LAUNCH_POINT[2]];

// Moon: astronaut's seated position sits exactly on its surface.
export const MOON_CENTER = [1.3, -4.4, -1.0];
export const MOON_RADIUS = 2.2;
export const MOON_SEAT_POSITION = [
  MOON_CENTER[0],
  MOON_CENTER[1] + MOON_RADIUS,
  MOON_CENTER[2],
];

// Planet gallery: raised to the seated mecha's eye line and moved farther
// along -Z, so the project planets are visibly in front of him on the moon
// instead of dropping below the horizon.
export const PLANET_ROW_Y = MOON_CENTER[1] + MOON_RADIUS + 0.45;
export const PLANET_ROW_Z = MOON_CENTER[2] - 3.0;
export const PLANET_ROW_SPACING = 2.2;
