// Tiny synthesized sound effects for the arcade brain games. No asset files —
// just short Web Audio oscillator blips. EVERYTHING is wrapped in try/catch so a
// missing/blocked audio device never throws and never breaks gameplay or tests.
// Mute is a per-window preference in localStorage (no DB model change).

type Sfx = 'good' | 'bad' | 'best'

let ctx: AudioContext | null = null
let muted = false
try {
  muted = localStorage.getItem('qd-arcade-muted') === '1'
} catch {
  /* localStorage unavailable — default unmuted */
}

export function isMuted(): boolean {
  return muted
}

/** Flip mute and persist it; returns the new state. */
export function toggleMuted(): boolean {
  muted = !muted
  try {
    localStorage.setItem('qd-arcade-muted', muted ? '1' : '0')
  } catch {
    /* ignore */
  }
  return muted
}

// Short note sequences (Hz). 'good' = a soft rising blip, 'bad' = a low buzz
// (never harsh — tone rule), 'best' = a little victory arpeggio.
const NOTES: Record<Sfx, number[]> = {
  good: [660],
  bad: [160],
  best: [523, 659, 784]
}

export function play(kind: Sfx): void {
  if (muted) return
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = ctx ?? new AC()
    NOTES[kind].forEach((freq, i) => {
      const t = ctx!.currentTime + i * 0.09
      const osc = ctx!.createOscillator()
      const gain = ctx!.createGain()
      osc.type = kind === 'bad' ? 'triangle' : 'sine'
      osc.frequency.value = freq
      // Quiet, quick envelope — a tap, not a fanfare.
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(kind === 'bad' ? 0.04 : 0.07, t + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15)
      osc.connect(gain).connect(ctx!.destination)
      osc.start(t)
      osc.stop(t + 0.17)
    })
  } catch {
    // No audio device, autoplay blocked, etc. — stay silent, never break play.
  }
}
