// Tiny WebAudio blip synth. Muted by default; toggle persists in localStorage.
'use strict';
const Sfx = {
  ctx: null, muted: localStorage.getItem('von_muted') !== '0', last: {},
  toggle() { this.muted = !this.muted; localStorage.setItem('von_muted', this.muted ? '1' : '0'); if (!this.muted) { this.ensure(); this.play('ui'); } },
  ensure() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; } }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(freq, dur, type = 'square', vol = 0.05, slide = 0) {
    const c = this.ctx; if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  play(name) {
    if (this.muted) return; this.ensure(); if (!this.ctx) return;
    const now = performance.now(); if (this.last[name] && now - this.last[name] < 45) return; this.last[name] = now;
    switch (name) {
      case 'ui': this.tone(660, 0.06, 'square', 0.04); break;
      case 'build': this.tone(220, 0.08, 'square', 0.05, 220); this.tone(440, 0.12, 'triangle', 0.04); break;
      case 'shoot': this.tone(520, 0.05, 'square', 0.02, -200); break;
      case 'boom': this.tone(120, 0.18, 'sawtooth', 0.05, -80); break;
      case 'hit': this.tone(300, 0.04, 'triangle', 0.03, -100); break;
      case 'die': this.tone(880, 0.07, 'square', 0.03, -500); break;
      case 'leak': this.tone(140, 0.25, 'sawtooth', 0.06, -60); break;
      case 'ability': this.tone(200, 0.3, 'sawtooth', 0.06, 600); break;
      case 'heat': this.tone(90, 0.2, 'square', 0.04); break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'square', 0.05), i * 120)); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'triangle', 0.06), i * 160)); break;
      case 'wave': this.tone(330, 0.12, 'square', 0.04); setTimeout(() => this.tone(494, 0.15, 'square', 0.04), 110); break;
    }
  }
};
