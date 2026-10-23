"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  createSpring,
  prefersReducedMotion,
  project,
  rubberband,
  SPRINGS,
  VelocityTracker,
  type SpringHandle,
} from "@/lib/motion";

// One carousel for all four galleries (Arlo, Milo, Tori, and the merged
// care timeline), which were four near-identical copies of the same
// cloned-slide pager — arrows and dots only, no way to swipe. On a phone,
// which is where these actually get looked at, that meant hitting a 36px
// arrow to see the next photo of your own children.
//
// What changed, in the language of Apple's fluid-interface talks:
//
//   Direct manipulation — the track is glued to the finger 1:1 for the
//   whole drag, not animated once the gesture ends.
//   Interruptibility — a moving carousel can be grabbed mid-flight and
//   reversed; the drag starts from the live on-screen offset and the
//   spring carries its velocity through the re-target, so a reversal
//   doesn't hit a brick wall.
//   Velocity handoff — the release velocity becomes the spring's initial
//   velocity, so there's no seam between dragging and animating.
//   Momentum projection — where a flick would come to rest decides which
//   photo you land on, which is what makes a flick feel like a throw.
//
// The infinite loop is kept. It's a deliberate, documented decision (see
// the long comment this replaces in ToriPhotosGallery): a clone of the
// last slide sits before the first and vice versa, so sliding past the end
// moves into something identical to the real next slide, and the seam is
// normalised silently once the spring settles. `loop={false}` instead
// rubber-bands at the ends — progressive resistance rather than a hard
// stop, so an edge reads as "nothing more here" rather than "frozen".

export interface CarouselSlide {
  id: string;
  src: string;
  type?: "photo" | "video";
  alt?: string;
}

// Below this, a release is a nudge rather than a throw: settle gracefully
// with no overshoot. Above it the gesture carried real momentum and has
// earned a little bounce.
const FLICK_VELOCITY = 0.35; // slides per second
// How far past halfway a slow drag must get to commit.
const COMMIT_FRACTION = 0.5;

export function PhotoCarousel({
  slides,
  className = "relative aspect-[4/3] w-full overflow-hidden bg-white sm:aspect-[16/9] md:aspect-auto md:h-full",
  loop = true,
  autoplay = false,
  autoplayMs = 3500,
  ariaLabel = "Photos",
}: {
  slides: CarouselSlide[];
  className?: string;
  loop?: boolean;
  // Off by default: a carousel that advances on its own takes the photo
  // you were looking at away from you. Opt in per gallery if ever wanted.
  autoplay?: boolean;
  autoplayMs?: number;
  ariaLabel?: string;
}) {
  const n = slides.length;
  const hasMultiple = n > 1;
  const looping = loop && hasMultiple;

  // With a loop, real slide i lives at track position i + 1.
  const track = looping ? [slides[n - 1], ...slides, slides[0]] : slides;
  const firstPos = looping ? 1 : 0;
  const lastPos = looping ? n : n - 1;

  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const springRef = useRef<SpringHandle | null>(null);
  const posRef = useRef(firstPos);
  const [index, setIndex] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  // Once a finger has touched this, the slideshow stops for good: the user
  // has taken control, and something that keeps moving on its own while
  // you're looking at it is the opposite of being in control.
  const [userEngaged, setUserEngaged] = useState(false);

  const drag = useRef<{
    pointerId: number;
    startX: number;
    startPos: number;
    width: number;
    moved: boolean;
  } | null>(null);
  const tracker = useRef(new VelocityTracker());

  const paint = useCallback((pos: number) => {
    posRef.current = pos;
    const el = trackRef.current;
    // Written straight to the node rather than through state: this runs
    // every frame of a drag, and a React render per frame is exactly the
    // latency the whole exercise is about removing.
    if (el) el.style.transform = `translate3d(${-pos * 100}%, 0, 0)`;
  }, []);

  const realIndex = useCallback(
    (pos: number) => {
      if (!looping) return Math.max(0, Math.min(n - 1, Math.round(pos)));
      return (((Math.round(pos) - 1) % n) + n) % n;
    },
    [looping, n]
  );

  // Normalise the loop seam: once settled on a clone, jump to the matching
  // real slide. They're the same picture, so nothing moves on screen.
  const settle = useCallback(() => {
    if (!looping) return;
    const pos = Math.round(posRef.current);
    if (pos === n + 1) springRef.current?.jump(1);
    else if (pos === 0) springRef.current?.jump(n);
  }, [looping, n]);

  useEffect(() => {
    const spring = createSpring(
      firstPos,
      SPRINGS.move,
      (value) => paint(value),
      () => settle()
    );
    springRef.current = spring;
    paint(firstPos);
    return () => spring.stop();
    // Re-created only if the slide set itself changes shape.
  }, [firstPos, n, paint, settle]);

  const goTo = useCallback(
    (pos: number, velocity = 0) => {
      const spring = springRef.current;
      if (!spring) return;
      setIndex(realIndex(pos));
      if (prefersReducedMotion()) {
        // A gentler equivalent, not the absence of feedback: no travel
        // across the screen, and the loop seam still resolves.
        spring.jump(pos);
        settle();
        return;
      }
      spring.setTarget(pos, velocity);
    },
    [realIndex, settle]
  );

  const step = useCallback(
    (delta: number) => {
      const from = Math.round(posRef.current);
      const next = looping
        ? from + delta
        : Math.max(firstPos, Math.min(lastPos, from + delta));
      goTo(next);
    },
    [firstPos, goTo, lastPos, looping]
  );

  // --- gesture ---------------------------------------------------------

  const onPointerDown = (e: React.PointerEvent) => {
    if (!hasMultiple) return;
    // A press that starts on the arrows, the dots, or a video's own
    // controls belongs to that control, not to the pager.
    //
    // This is load-bearing, not tidiness: setPointerCapture() below
    // retargets every later event for this pointer to the container, so
    // the pointerup lands on the container rather than on the button that
    // was pressed. The browser fires `click` at the nearest common
    // ancestor of the down and up targets — the container — and the
    // button's onClick never runs. Capturing on pointerdown silently
    // breaks every button inside the carousel; verified in Chromium.
    if ((e.target as HTMLElement).closest("button, a, video")) return;
    const container = containerRef.current;
    const spring = springRef.current;
    if (!container || !spring) return;

    setUserEngaged(true);
    // Interruptibility: stop where it is (velocity preserved) and continue
    // from the live on-screen value, never from the logical target — that
    // is what stops a grab mid-flight jumping.
    spring.stop();

    container.setPointerCapture(e.pointerId);
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startPos: posRef.current,
      width: container.getBoundingClientRect().width || 1,
      moved: false,
    };
    tracker.current.reset();
    tracker.current.add(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;

    const dx = e.clientX - d.startX;
    // A small threshold before committing to the drag, so a tap with a
    // shaky finger still reads as a tap.
    if (!d.moved && Math.abs(dx) < 4) return;
    d.moved = true;

    tracker.current.add(e.clientX);

    let pos = d.startPos - dx / d.width;
    if (!looping) {
      // Progressive resistance past the ends, in pixels, then back to
      // slide units — a hard stop reads as frozen.
      if (pos < firstPos) {
        const overshoot = (firstPos - pos) * d.width;
        pos = firstPos - rubberband(overshoot, d.width) / d.width;
      } else if (pos > lastPos) {
        const overshoot = (pos - lastPos) * d.width;
        pos = lastPos + rubberband(overshoot, d.width) / d.width;
      }
    }
    paint(pos);
    const i = realIndex(pos);
    if (i !== index) setIndex(i);
  };

  const endDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    drag.current = null;
    containerRef.current?.releasePointerCapture?.(e.pointerId);
    if (!d.moved) return;

    // px/s, then slides/s. Positive dx moves the track right, which is a
    // decreasing position — hence the sign flip.
    const velocity = -tracker.current.velocity / d.width;
    const pos = posRef.current;

    // Where the flick would come to rest, not where the finger let go.
    const projected = pos + project(velocity);
    const from = Math.round(d.startPos);

    let target: number;
    if (Math.abs(velocity) > FLICK_VELOCITY) {
      // A real throw: commit in the direction of travel. The velocity's
      // SIGN decides, not the position — a fast flick back the way you
      // came should reverse even if you're past the midpoint.
      target = velocity > 0 ? from + 1 : from - 1;
    } else {
      // A slow drag: did it get far enough past halfway to commit? Snap to
      // whichever page the projected resting point is nearest, but never
      // more than one page, so the pager stays predictable.
      const drifted = projected - from;
      target =
        Math.abs(drifted) > COMMIT_FRACTION ? from + Math.sign(drifted) : from;
    }

    if (!looping) target = Math.max(firstPos, Math.min(lastPos, target));

    const spring = springRef.current;
    if (spring) {
      // Bounce only because a flick preceded it. Overshoot on a slide you
      // merely nudged would feel wrong.
      const config = Math.abs(velocity) > FLICK_VELOCITY ? SPRINGS.flick : SPRINGS.move;
      spring.reconfigure(config);
    }
    goTo(target, velocity);
  };

  // --- autoplay --------------------------------------------------------

  useEffect(() => {
    if (!autoplay) return;
    if (!hasMultiple || userEngaged || videoPlaying) return;
    if (prefersReducedMotion()) return;
    if (!looping && Math.round(posRef.current) >= lastPos) return;
    const id = setInterval(() => step(1), autoplayMs);
    return () => clearInterval(id);
  }, [autoplay, autoplayMs, hasMultiple, lastPos, looping, step, userEngaged, videoPlaying]);

  // --- keyboard --------------------------------------------------------

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!hasMultiple) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setUserEngaged(true);
      step(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setUserEngaged(true);
      step(1);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`${className} ${hasMultiple ? "draggable-x cursor-grab active:cursor-grabbing" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      tabIndex={hasMultiple ? 0 : undefined}
      role={hasMultiple ? "group" : undefined}
      aria-roledescription={hasMultiple ? "carousel" : undefined}
      aria-label={hasMultiple ? ariaLabel : undefined}
    >
      <div ref={trackRef} className="flex h-full" style={{ willChange: "transform" }}>
        {track.map((s, i) => (
          <div key={`${s.id}-${i}`} className="h-full w-full shrink-0">
            {s.type === "video" ? (
              <video
                src={s.src}
                controls
                playsInline
                preload="metadata"
                onPlay={() => setVideoPlaying(true)}
                onPause={() => setVideoPlaying(false)}
                onEnded={() => setVideoPlaying(false)}
                className="h-full w-full object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.src}
                alt={s.alt ?? ""}
                loading="lazy"
                decoding="async"
                draggable={false}
                className="h-full w-full select-none object-contain"
              />
            )}
          </div>
        ))}
      </div>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={() => {
              setUserEngaged(true);
              step(-1);
            }}
            aria-label="Previous photo"
            className="press-scale material-chip absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setUserEngaged(true);
              step(1);
            }}
            aria-label="Next photo"
            className="press-scale material-chip absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setUserEngaged(true);
                  goTo(i + firstPos);
                }}
                aria-label={`Go to photo ${i + 1}`}
                aria-current={i === index}
                className={`pointer-events-auto h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/60 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
