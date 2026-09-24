import type { SceneId } from './scenes'

/**
 * Fully procedural, optional sound (default OFF, never autoplays).
 * A low drone pad whose chord follows the scene, wind that rises with scroll
 * speed, and tiny interaction sounds. No audio files.
 */
const CHORDS: Record<SceneId, number[]> = {
  aperture: [55, 82.41, 110],
  hall: [73.42, 110, 184.99],
  exhibition: [65.41, 98, 164.81],
  transmutation: [61.74, 92.5, 146.83],
  weightless: [82.41, 123.47, 207.65],
  passage: [55, 110, 164.81],
  daylight: [73.42, 110, 184.99],
}

class Engine {
  ctx: AudioContext | null = null
  master!: GainNode
  padFilter!: BiquadFilterNode
  oscs: OscillatorNode[] = []
  windGain!: GainNode
  windFilter!: BiquadFilterNode
  on = false
  scene: SceneId = 'aperture'

  private init() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0
    const comp = ctx.createDynamicsCompressor()
    this.master.connect(comp).connect(ctx.destination)

    // pad
    this.padFilter = ctx.createBiquadFilter()
    this.padFilter.type = 'lowpass'
    this.padFilter.frequency.value = 320
    this.padFilter.Q.value = 0.8
    const padGain = ctx.createGain()
    padGain.gain.value = 0.11
    this.padFilter.connect(padGain).connect(this.master)
    CHORDS.aperture.forEach((f, i) => {
      for (const detune of [-6, 5]) {
        const o = ctx.createOscillator()
        o.type = i === 0 ? 'sine' : 'triangle'
        o.frequency.value = f
        o.detune.value = detune
        const g = ctx.createGain()
        g.gain.value = i === 0 ? 0.5 : 0.22
        o.connect(g).connect(this.padFilter)
        o.start()
        this.oscs.push(o)
      }
    })
    // slow filter LFO
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.07
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 90
    lfo.connect(lfoGain).connect(this.padFilter.frequency)
    lfo.start()

    // wind
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1
      last = (last + 0.02 * w) / 1.02
      d[i] = last * 3.5
    }
    const noise = ctx.createBufferSource()
    noise.buffer = buf
    noise.loop = true
    this.windFilter = ctx.createBiquadFilter()
    this.windFilter.type = 'bandpass'
    this.windFilter.frequency.value = 500
    this.windFilter.Q.value = 0.6
    this.windGain = ctx.createGain()
    this.windGain.gain.value = 0.02
    noise.connect(this.windFilter).connect(this.windGain).connect(this.master)
    noise.start()
  }

  enable() {
    if (!this.ctx) this.init()
    const ctx = this.ctx!
    ctx.resume()
    this.on = true
    this.master.gain.cancelScheduledValues(ctx.currentTime)
    this.master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.8)
    this.setScene(this.scene, true)
  }

  disable() {
    if (!this.ctx) return
    this.on = false
    const ctx = this.ctx
    this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.25)
    setTimeout(() => {
      if (!this.on) ctx.suspend()
    }, 1200)
  }

  setScene(id: SceneId, immediate = false) {
    const changed = id !== this.scene
    this.scene = id
    if (!this.ctx || !this.on) return
    const t = this.ctx.currentTime
    const chord = CHORDS[id]
    this.oscs.forEach((o, i) => o.frequency.setTargetAtTime(chord[Math.floor(i / 2)], t, immediate ? 0.01 : 1.4))
    const cutoff = id === 'daylight' ? 900 : id === 'weightless' ? 700 : id === 'passage' ? 420 : 300
    this.padFilter.frequency.setTargetAtTime(cutoff, t, 1.2)
    if (changed && !immediate) this.whoosh(0.5)
  }

  update(speed: number) {
    if (!this.ctx || !this.on) return
    const t = this.ctx.currentTime
    this.windGain.gain.setTargetAtTime(0.015 + speed * 0.12, t, 0.15)
    this.windFilter.frequency.setTargetAtTime(380 + speed * 1600, t, 0.2)
  }

  whoosh(amount = 1) {
    if (!this.ctx || !this.on) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    const len = ctx.sampleRate * 1.6
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    src.buffer = buf
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 1.4
    f.frequency.setValueAtTime(180, t)
    f.frequency.exponentialRampToValueAtTime(1800, t + 0.7)
    f.frequency.exponentialRampToValueAtTime(300, t + 1.5)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.1 * amount, t + 0.55)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.55)
    src.connect(f).connect(g).connect(this.master)
    src.start(t)
    src.stop(t + 1.6)
  }

  blip(freq: number, dur: number, gain: number, type: OscillatorType = 'sine', to?: number) {
    if (!this.ctx || !this.on) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(this.master)
    o.start(t)
    o.stop(t + dur + 0.02)
  }
}

export const audio = new Engine()

export function sfx(kind: 'hover' | 'click' | 'open' | 'close' | 'menu') {
  switch (kind) {
    case 'hover':
      return audio.blip(1480, 0.05, 0.018)
    case 'click':
      return audio.blip(740, 0.12, 0.05, 'triangle', 440)
    case 'open':
      audio.whoosh(0.8)
      return audio.blip(220, 0.9, 0.05, 'sine', 440)
    case 'close':
      audio.whoosh(0.6)
      return audio.blip(440, 0.7, 0.04, 'sine', 220)
    case 'menu':
      return audio.blip(330, 0.35, 0.045, 'sine', 165)
  }
}
