export const GAME_CONSTANTS = {
  LANE_COUNT: 3,
  HERO_X_RATIO: 0.09, // hero left = 0.09 * width
  HERO_WIDTH: 96,
  HERO_HEIGHT: 120,
  HERO_HITBOX_PADDING: 18, // from design collision math
  HERO_LANE_TRANSITION_DURATION: 130, // ms (design: 130ms lane switch)
  CANDY_SIZE: 52,
  CANDY_BASE_SPEED: 340, // px/s
  CANDY_SPEED_RAMP_MAX: 260,
  CANDY_SPEED_RAMP_RATE: 0.006,
  SPAWN_INTERVAL: 900, // ms
  SPAWN_INTERVAL_MIN: 420,
  SPAWN_INTERVAL_RAMP_RATE: 0.004,
  OBSTACLE_MAX_ACTIVE: 8, // design pool size
  INVULN_DURATION: 1400, // ms
  SCORE_PER_DODGE: 10,
  FRAME_TIME_MS: 1000 / 60,
  MAX_FRAME_DELTA_MS: 50, // clamp a background/resume gap
};
