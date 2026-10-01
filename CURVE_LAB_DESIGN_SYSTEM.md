# Curve Lab Design System v1.0: Oscillator mapping

Audio Curve Lab supplies the shared visual-language reference, not code ownership. Oscillator Curve Lab keeps its own controls, two-canvas frequency/curve workspace, modulation, convolution, and FFT observation panel. This document records portable token meanings; `src/styles.css` and Canvas paint are the current web mapping.

## Visual hierarchy

1. Brand/header: 48 px Curve Lab mark, product name with colored `Curve Lab`, compact supporting text.
2. Transport: time, Open Audio, Play/Stop, duration, channel format, WAV download.
3. Parameter/tool area: waveform, count, stack, modulation, optional convolution; curve-mode buttons and Pen/Eraser.
   The sound-generation row uses equal-weight Oscillator, Resynthesis, and Convolution buttons. Mode-specific controls appear beside them; the shared curve editor remains in place.
4. Thin status strip: current curve, points, voices, base, deviation, slope, safety, WAV.
5. Dark workspace: current oscillator values above the larger curve editor. FFT is a separate optional observation panel below; it never edits curves.

The canvas remains the primary work surface. Do not replace the module layout with an Audio Curve Lab screenshot or a decorative hero.

## Portable tokens and current web values

| Meaning | Current value | Web token / source |
| --- | --- | --- |
| Environment | deep navy `#07111c`, deeper `#050b12` | `--cl-bg`, `--cl-bg-deep` |
| Surface / raised surface | `#0d1b29` / `#122438` | `--cl-surface`, `--cl-surface-raised` |
| Border / strong border | `#203a52` / `#345672` | `--cl-border`, `--cl-border-strong` |
| Primary / secondary text | `#e8f0f6` / `#aabccc` | `--cl-text`, `--cl-text-secondary` |
| Oscillator identity | Green `#53c78c` | `--cl-accent`; mark, title, restrained focus/identity accents |
| Focus | `#8ce6b3`, 2 px outline with 2 px offset | `--cl-focus`, `:focus-visible` |
| Small/medium/large radius | 4/6/8 px | `--cl-radius-sm/md/lg` |
| Spacing scale | 4/8/12/16/24 px | `--cl-space-1/2/3/4/6` |
| Common control / toolbar height | 38/54 px | `--cl-control-height`, `--cl-toolbar-height` |
| Type | system UI font; compact workbench hierarchy | root font stack and component rules |
| Button motion | 140 ms color/border transition | button rules; disabled under reduced motion |

Brand color is **not** parameter meaning. Do not wash the whole app green. Current parameter identities are Base Freq `#6de0c0`, Deviation `#e34b4b`, Spectral Slope `#6fa8dc`, FM Strength `#b887f4`, AM Depth `#e1a058`, and Ring Blend `#ec809a` (`src/app.js`). The curve, points, active mode border/background, and tooltip border follow parameter identity. Tune only for contrast, preserving meaning.

## Workspace and states

Canvas uses a dark `#0c1f31` field, more visible major than minor grid, legible axis labels, and a restrained playhead. Base Freq's editor axis follows the actual 20-4000 Hz logarithmic mapping; the FFT panel has a separate 20 Hz-20 kHz observation axis. The current-value panel shows oscillator frequencies, not a second editable curve. Point and tooltip placement must remain coherent at both curve extremes.

Buttons expose hover, active, focus-visible, and disabled states. Pen/Eraser remain a paired icon toggle with named hover help. Modulation and convolution controls appear only when meaningful. The page has a subtle ambient background; `prefers-reduced-motion` removes its motion. Use system fonts and no external visual package by default.

For narrow screens the toolbar/status wrap and the fixed-format canvas scrolls horizontally instead of changing normalized curve data. In a Standalone UI, map these meanings to native controls and drawing primitives; copying CSS pixels verbatim is not required. Any token change that alters hierarchy or parameter identity needs a decision record and a regression check.
