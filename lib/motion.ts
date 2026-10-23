// Motion primitives, in Apple's vocabulary rather than a physics engine's.
//
// The through-line from Apple's "Designing Fluid Interfaces": an interface
// feels alive when motion starts from the current on-screen value, inherits
// the user's velocity, projects momentum forward, and can be grabbed and
// reversed at any instant. Springs are the tool that makes that natural,
// because they are inherently interruptible and velocity-aware — a
// fixed-duration CSS transition is none of those things, which is why
// anything a finger can touch is driven from here instead.
//
// No dependency: this is ~120 lines and the app has stayed deliberately
// thin on packages (exceljs over xlsx, no UI kit). Everything below is
// pure and framework-agnostic; React components drive it from effects.

/**
 * Apple describes springs with two designer-facing numbers rather than the
 * mass/stiffness/damping triplet:
 *
 *   damping  — overshoot. 1.0 is critically damped (no bounce); below 1.0
 *              overshoots and oscillates; lower is bouncier.
 *   response — how quickly the value reaches the target, in seconds. This
 *              is NOT a duration: a spring has no fixed duration, its
 *              settle time emerges from the parameters.
 */
export interface SpringConfig {
  damping: number;
  response: number;
}

/**
 * The values Apple ships, straight from the talk. Default to MOVE: bounce
 * on a menu that merely appeared feels wrong, while bounce on a card you
 * flicked feels right — so overshoot is reserved for motion the user's own
 * gesture set going.
 */
export const SPRINGS = {
  /** Move / reposition. Critically damped — graceful, non-distracting. */
  move: { damping: 1.0, response: 0.4 } satisfies SpringConfig,
  /** Rotation. */
  rotate: { damping: 0.8, response: 0.4 } satisfies SpringConfig,
  /** Drawers and sheets — snappier, with a little overshoot. */
  sheet: { damping: 0.8, response: 0.3 } satisfies SpringConfig,
  /** Momentum releases: a flick or throw earned its bounce. */
  flick: { damping: 0.8, response: 0.4 } satisfies SpringConfig,
} as const;

export interface SpringHandle {
  /**
   * Re-target. Velocity is carried through by default, which is what stops
   * a mid-gesture reversal feeling like a brick wall: replacing one
   * animation with another at a reversal creates a velocity discontinuity,
   * and continuing from the live velocity avoids it.
   */
  setTarget(target: number, velocity?: number): void;
  /** Jump without animating — used when a loop seam is normalised. */
  jump(value: number): void;
  /**
   * Swap the spring's character mid-life, so the same spring can settle a
   * nudge critically damped and a flick with a little overshoot. Keeps the
   * current value and velocity, so changing it during motion is seamless.
   */
  reconfigure(config: SpringConfig): void;
  stop(): void;
  readonly value: number;
  readonly velocity: number;
  readonly isAnimating: boolean;
}

/**
 * A scalar spring on requestAnimationFrame — the web's display-synced
 * clock, and the equivalent of the CADisplayLink Apple drives these from.
 *
 * Deliberately one spring per axis: a single spring on a 2D distance
 * desyncs the moment X and Y carry different velocities.
 */
export function createSpring(
  initial: number,
  config: SpringConfig,
  onUpdate: (value: number) => void,
  onRest?: () => void
): SpringHandle {
  let value = initial;
  let velocity = 0;
  let target = initial;
  let raf: number | null = null;
  let lastTime = 0;

  // omega = natural frequency; response is the period, so 2pi/T.
  let omega = (2 * Math.PI) / config.response;
  let zeta = config.damping;

  const REST_VALUE = 0.01;
  const REST_VELOCITY = 0.05;
  // Fixed substep: large frame gaps (a dropped frame, a backgrounded tab)
  // make a naive integration explode.
  const STEP = 1 / 240;

  const tick = (now: number) => {
    const frame = Math.min((now - lastTime) / 1000, 0.064);
    lastTime = now;

    let remaining = frame;
    while (remaining > 0) {
      const dt = Math.min(remaining, STEP);
      remaining -= dt;
      const displacement = value - target;
      const accel = -(omega * omega) * displacement - 2 * zeta * omega * velocity;
      velocity += accel * dt;
      value += velocity * dt;
    }

    if (Math.abs(value - target) < REST_VALUE && Math.abs(velocity) < REST_VELOCITY) {
      value = target;
      velocity = 0;
      raf = null;
      onUpdate(value);
      onRest?.();
      return;
    }

    onUpdate(value);
    raf = requestAnimationFrame(tick);
  };

  const start = () => {
    if (raf !== null) return;
    lastTime = performance.now();
    raf = requestAnimationFrame(tick);
  };

  return {
    setTarget(next: number, nextVelocity?: number) {
      target = next;
      if (nextVelocity !== undefined) velocity = nextVelocity;
      start();
    },
    reconfigure(next: SpringConfig) {
      omega = (2 * Math.PI) / next.response;
      zeta = next.damping;
    },
    jump(next: number) {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      value = next;
      target = next;
      velocity = 0;
      onUpdate(value);
    },
    stop() {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      // velocity is intentionally preserved: a gesture that grabs a moving
      // element should inherit the motion it interrupted.
    },
    get value() {
      return value;
    },
    get velocity() {
      return velocity;
    },
    get isAnimating() {
      return raf !== null;
    },
  };
}

/**
 * Where a flick would come to rest, so you can snap to the target nearest
 * that point rather than the one nearest the release point. This is what
 * makes a flick feel like it throws something.
 *
 * Apple's exponential-decay form from the Designing Fluid Interfaces sample
 * code — NOT the physics-textbook v^2/(2a), which behaves differently and
 * isn't what iOS ships.
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Progressive resistance past a boundary. A hard stop reads as frozen;
 * resistance reads as "responsive, but there's nothing more here".
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** Tracks the last few pointer samples so a release can hand off real velocity. */
export class VelocityTracker {
  private samples: { position: number; time: number }[] = [];

  add(position: number, time = performance.now()) {
    this.samples.push({ position, time });
    // ~100ms of history: enough to smooth jitter, short enough that a pause
    // before release reads as a stop rather than a throw.
    while (this.samples.length > 2 && time - this.samples[0].time > 100) {
      this.samples.shift();
    }
  }

  /** px per second, 0 when there isn't enough recent movement to tell. */
  get velocity(): number {
    if (this.samples.length < 2) return 0;
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const dt = (last.time - first.time) / 1000;
    if (dt <= 0) return 0;
    return (last.position - first.position) / dt;
  }

  reset() {
    this.samples = [];
  }
}

/**
 * Reduced motion doesn't mean no feedback — it means a gentler,
 * non-vestibular equivalent. Callers use this to swap springs and slides
 * for instant changes or opacity cross-fades, and to stop anything that
 * moves on its own.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
