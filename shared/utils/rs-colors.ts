const BRIGHTNESS_MAX = 0.6

let colorPalette: Int32Array | null = null

export function getColorPalette(): Int32Array {
  if (!colorPalette)
    colorPalette = createPalette(BRIGHTNESS_MAX)
  return colorPalette
}

function createPalette(brightness: number): Int32Array {
  const palette = new Int32Array(65536)

  for (let i = 0; i < 65536; i++) {
    const hue = ((i >> 10) & 63) / 64 + 0.0078125
    const saturation = ((i >> 7) & 7) / 8 + 0.0625
    const luminance = (i & 127) / 128

    const rgb = hslToRgb(hue, saturation, luminance)

    const r = Math.min(255, Math.round(Math.pow(((rgb >> 16) & 0xFF) / 256, brightness) * 256))
    const g = Math.min(255, Math.round(Math.pow(((rgb >> 8) & 0xFF) / 256, brightness) * 256))
    const b = Math.min(255, Math.round(Math.pow((rgb & 0xFF) / 256, brightness) * 256))

    palette[i] = (r << 16) | (g << 8) | b
  }

  return palette
}

function hslToRgb(hue: number, saturation: number, luminance: number): number {
  let r: number, g: number, b: number

  if (saturation === 0) {
    r = g = b = luminance
  } else {
    const q = luminance < 0.5
      ? luminance * (1 + saturation)
      : luminance + saturation - luminance * saturation
    const p = 2 * luminance - q

    r = hueToRgbChannel(p, q, hue + 1 / 3)
    g = hueToRgbChannel(p, q, hue)
    b = hueToRgbChannel(p, q, hue - 1 / 3)
  }

  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255)
}

function hueToRgbChannel(p: number, q: number, t: number): number {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}

export function adjustLightness(hsl: number, light: number): number {
  const lum = (hsl & 127) * light >> 7
  return (hsl & 0xFF80) | Math.max(2, Math.min(126, lum))
}
