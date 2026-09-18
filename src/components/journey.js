import { HOP_WAYPOINTS, LAUNCH_POINT, FLIGHT_APEX, MOON_SEAT_POSITION, PLANET_ROW_Z } from './sceneConstants.js';

export const PHASE_BANDS = [
  { end: 0.08, phase: 'sleeping' },
  { end: 0.18, phase: 'waking' },
  { end: 0.30, phase: 'idle' },
  { end: 0.46, phase: 'hopping' },
  { end: 0.54, phase: 'launching' },
  { end: 0.78, phase: 'flying' },
  { end: 0.88, phase: 'landing' },
  { end: 1, phase: 'seated' },
];
export const clamp = value => Math.min(1, Math.max(0, value));
export const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
export function phaseForProgress(progress) {
  return PHASE_BANDS.find(band => progress < band.end)?.phase || 'seated';
}

// Every branch meets the next at the same world position. No wall-clock hop
// index: wheel speed and reverse scrolling cannot skip or teleport the route.
export function sampleJourney(progress, position) {
  const p = clamp(progress);
  const count = HOP_WAYPOINTS.length - 1;
  const facing = Math.atan2(-MOON_SEAT_POSITION[0], PLANET_ROW_Z - MOON_SEAT_POSITION[2]);
  const last = HOP_WAYPOINTS[count - 1];
  const launchYaw = Math.atan2(LAUNCH_POINT[0] - last[0], LAUNCH_POINT[2] - last[2]);
  if (p < 0.30) {
    position.fromArray(HOP_WAYPOINTS[0]);
    return 0;
  }
  if (p < 0.46) {
    const route = clamp((p - 0.30) / 0.16) * count;
    const index = Math.min(count - 1, Math.floor(route));
    const local = route - index;
    const from = HOP_WAYPOINTS[index], to = HOP_WAYPOINTS[index + 1];
    // A brief contact beat at both ends makes each surface landing readable.
    const t = smooth((local - 0.10) / 0.80);
    position.set(from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t + Math.sin(t * Math.PI) * 0.9,
      from[2] + (to[2] - from[2]) * t);
    return Math.atan2(to[0] - from[0], to[2] - from[2]);
  }
  if (p < 0.54) {
    const t = smooth((p - 0.46) / 0.08);
    position.set(LAUNCH_POINT[0], LAUNCH_POINT[1] + (FLIGHT_APEX[1] - LAUNCH_POINT[1]) * t, LAUNCH_POINT[2]);
    return launchYaw;
  }
  if (p < 0.78) {
    const t = smooth((p - 0.54) / 0.24);
    position.set(FLIGHT_APEX[0] + (MOON_SEAT_POSITION[0] - FLIGHT_APEX[0]) * t,
      FLIGHT_APEX[1] + (MOON_SEAT_POSITION[1] + 1.2 - FLIGHT_APEX[1]) * t,
      FLIGHT_APEX[2] + (MOON_SEAT_POSITION[2] - FLIGHT_APEX[2]) * t);
    const turn = Math.atan2(Math.sin(facing - launchYaw), Math.cos(facing - launchYaw));
    return launchYaw + turn * t;
  }
  position.fromArray(MOON_SEAT_POSITION);
  if (p < 0.88) position.y += 1.2 * (1 - smooth((p - 0.78) / 0.10));
  return facing;
}
