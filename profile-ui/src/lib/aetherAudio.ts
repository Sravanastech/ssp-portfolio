/**
 * Procedural Web Audio micro-soundscape for Aether.
 * Zero external audio assets; AudioContext is lazy-created only after opt-in.
 */

type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;

function resolveAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const win = window as Window & {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return win.AudioContext ?? win.webkitAudioContext ?? null;
}

function getAudioContext(): AudioContext | null {
  try {
    if (ctx && ctx.state !== "closed") {
      if (ctx.state === "suspended") {
        void ctx.resume().catch(() => undefined);
      }
      return ctx;
    }
    const Ctor = resolveAudioContextCtor();
    if (!Ctor) return null;
    ctx = new Ctor();
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => undefined);
    }
    return ctx;
  } catch {
    return null;
  }
}

/** Lazy-initializes and resumes the shared Web Audio context after user opt-in. */
export function enable(): boolean {
  return getAudioContext() !== null;
}

/** Ultra-subtle 24ms crystal click (sine 1240Hz -> 680Hz, peak gain 0.025). */
export function playHoverTick(): void {
  try {
    const ac = getAudioContext();
    if (!ac) return;
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1240, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.024);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.025, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.024);

    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.025);
  } catch {
    // Ignore blocked or unavailable AudioContext.
  }
}

/** Subtle 140ms harmonic chord (523.25Hz & 783.99Hz, peak gain 0.03). */
export function playSwitchChime(): void {
  try {
    const ac = getAudioContext();
    if (!ac) return;
    const now = ac.currentTime;
    const master = ac.createGain();

    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(0.03, now + 0.012);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    master.connect(ac.destination);

    for (const freq of [523.25, 783.99]) {
      const osc = ac.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      osc.connect(master);
      osc.start(now);
      osc.stop(now + 0.145);
    }
  } catch {
    // Ignore blocked or unavailable AudioContext.
  }
}
