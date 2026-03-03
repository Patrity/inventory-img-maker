import { getColorPalette } from './rs-colors'

export class Rasterizer {
  pixels: Int32Array
  width: number
  height: number

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.pixels = new Int32Array(width * height)
  }

  clear() {
    this.pixels.fill(0)
  }

  rasterFlat(
    y0: number, y1: number, y2: number,
    x0: number, x1: number, x2: number,
    color: number
  ) {
    const palette = getColorPalette()
    const rgb = palette[color & 0xFFFF]
    this.rasterSolid(y0, y1, y2, x0, x1, x2, rgb)
  }

  rasterGouraud(
    y0: number, y1: number, y2: number,
    x0: number, x1: number, x2: number,
    c0: number, c1: number, c2: number
  ) {
    const palette = getColorPalette()
    const rgb0 = palette[c0 & 0xFFFF]
    const rgb1 = palette[c1 & 0xFFFF]
    const rgb2 = palette[c2 & 0xFFFF]
    this.rasterInterpolated(y0, y1, y2, x0, x1, x2, rgb0, rgb1, rgb2)
  }

  private rasterSolid(
    y0: number, y1: number, y2: number,
    x0: number, x1: number, x2: number,
    rgb: number
  ) {
    // Sort vertices by Y (top to bottom)
    let tmpI: number
    if (y1 < y0) {
      tmpI = y0
      y0 = y1
      y1 = tmpI
      tmpI = x0
      x0 = x1
      x1 = tmpI
    }
    if (y2 < y0) {
      tmpI = y0
      y0 = y2
      y2 = tmpI
      tmpI = x0
      x0 = x2
      x2 = tmpI
    }
    if (y2 < y1) {
      tmpI = y1
      y1 = y2
      y2 = tmpI
      tmpI = x1
      x1 = x2
      x2 = tmpI
    }

    const dy01 = y1 - y0
    const dy02 = y2 - y0
    const dy12 = y2 - y1

    if (dy02 === 0) return

    const dxdy02 = ((x2 - x0) << 16) / dy02

    // Top half (y0 to y1)
    if (dy01 > 0) {
      const dxdy01 = ((x1 - x0) << 16) / dy01
      let xLeft = x0 << 16
      let xRight = x0 << 16

      for (let y = y0; y < y1; y++) {
        if (y >= 0 && y < this.height) {
          const xl = Math.max(0, Math.min(this.width, xLeft >> 16))
          const xr = Math.max(0, Math.min(this.width, xRight >> 16))
          const startX = Math.min(xl, xr)
          const endX = Math.max(xl, xr)
          const rowOffset = y * this.width
          for (let x = startX; x < endX; x++)
            this.pixels[rowOffset + x] = rgb
        }
        xLeft += dxdy01
        xRight += dxdy02
      }
    }

    // Bottom half (y1 to y2)
    if (dy12 > 0) {
      const dxdy12 = ((x2 - x1) << 16) / dy12
      let xLeft = x1 << 16
      let xRight = (x0 << 16) + dxdy02 * dy01

      for (let y = y1; y < y2; y++) {
        if (y >= 0 && y < this.height) {
          const xl = Math.max(0, Math.min(this.width, xLeft >> 16))
          const xr = Math.max(0, Math.min(this.width, xRight >> 16))
          const startX = Math.min(xl, xr)
          const endX = Math.max(xl, xr)
          const rowOffset = y * this.width
          for (let x = startX; x < endX; x++)
            this.pixels[rowOffset + x] = rgb
        }
        xLeft += dxdy12
        xRight += dxdy02
      }
    }
  }

  private rasterInterpolated(
    y0: number, y1: number, y2: number,
    x0: number, x1: number, x2: number,
    rgb0: number, rgb1: number, rgb2: number
  ) {
    // Sort vertices by Y (top to bottom), keeping colors matched
    let tmpI: number
    if (y1 < y0) {
      tmpI = y0
      y0 = y1
      y1 = tmpI
      tmpI = x0
      x0 = x1
      x1 = tmpI
      tmpI = rgb0
      rgb0 = rgb1
      rgb1 = tmpI
    }
    if (y2 < y0) {
      tmpI = y0
      y0 = y2
      y2 = tmpI
      tmpI = x0
      x0 = x2
      x2 = tmpI
      tmpI = rgb0
      rgb0 = rgb2
      rgb2 = tmpI
    }
    if (y2 < y1) {
      tmpI = y1
      y1 = y2
      y2 = tmpI
      tmpI = x1
      x1 = x2
      x2 = tmpI
      tmpI = rgb1
      rgb1 = rgb2
      rgb2 = tmpI
    }

    const dy02 = y2 - y0
    if (dy02 === 0) return

    const dy01 = y1 - y0
    const dy12 = y2 - y1

    const r0 = (rgb0 >> 16) & 0xFF
    const g0 = (rgb0 >> 8) & 0xFF
    const b0 = rgb0 & 0xFF
    const r1 = (rgb1 >> 16) & 0xFF
    const g1 = (rgb1 >> 8) & 0xFF
    const b1 = rgb1 & 0xFF
    const r2 = (rgb2 >> 16) & 0xFF
    const g2 = (rgb2 >> 8) & 0xFF
    const b2 = rgb2 & 0xFF

    // Top half
    if (dy01 > 0) {
      for (let y = Math.max(y0, 0); y < Math.min(y1, this.height); y++) {
        const t02 = (y - y0) / dy02
        const t01 = (y - y0) / dy01
        let xa = x0 + (x2 - x0) * t02
        let xb = x0 + (x1 - x0) * t01
        let ra = r0 + (r2 - r0) * t02
        let ga = g0 + (g2 - g0) * t02
        let ba = b0 + (b2 - b0) * t02
        let rb = r0 + (r1 - r0) * t01
        let gb = g0 + (g1 - g0) * t01
        let bb = b0 + (b1 - b0) * t01

        if (xa > xb) {
          let tmp = xa
          xa = xb
          xb = tmp
          tmp = ra
          ra = rb
          rb = tmp
          tmp = ga
          ga = gb
          gb = tmp
          tmp = ba
          ba = bb
          bb = tmp
        }

        const startX = Math.max(0, Math.ceil(xa))
        const endX = Math.min(this.width, Math.ceil(xb))
        const spanWidth = xb - xa
        const rowOffset = y * this.width

        for (let x = startX; x < endX; x++) {
          const t = spanWidth > 0 ? (x - xa) / spanWidth : 0
          const r = (ra + (rb - ra) * t) | 0
          const g = (ga + (gb - ga) * t) | 0
          const b = (ba + (bb - ba) * t) | 0
          this.pixels[rowOffset + x] = (r << 16) | (g << 8) | b
        }
      }
    }

    // Bottom half
    if (dy12 > 0) {
      for (let y = Math.max(y1, 0); y < Math.min(y2, this.height); y++) {
        const t02 = (y - y0) / dy02
        const t12 = (y - y1) / dy12
        let xa = x0 + (x2 - x0) * t02
        let xb = x1 + (x2 - x1) * t12
        let ra = r0 + (r2 - r0) * t02
        let ga = g0 + (g2 - g0) * t02
        let ba = b0 + (b2 - b0) * t02
        let rb = r1 + (r2 - r1) * t12
        let gb = g1 + (g2 - g1) * t12
        let bb = b1 + (b2 - b1) * t12

        if (xa > xb) {
          let tmp = xa
          xa = xb
          xb = tmp
          tmp = ra
          ra = rb
          rb = tmp
          tmp = ga
          ga = gb
          gb = tmp
          tmp = ba
          ba = bb
          bb = tmp
        }

        const startX = Math.max(0, Math.ceil(xa))
        const endX = Math.min(this.width, Math.ceil(xb))
        const spanWidth = xb - xa
        const rowOffset = y * this.width

        for (let x = startX; x < endX; x++) {
          const t = spanWidth > 0 ? (x - xa) / spanWidth : 0
          const r = (ra + (rb - ra) * t) | 0
          const g = (ga + (gb - ga) * t) | 0
          const b = (ba + (bb - ba) * t) | 0
          this.pixels[rowOffset + x] = (r << 16) | (g << 8) | b
        }
      }
    }
  }

  toImageData(): ImageData {
    const imageData = new ImageData(this.width, this.height)
    const data = imageData.data
    for (let i = 0; i < this.pixels.length; i++) {
      const rgb = this.pixels[i]
      const offset = i * 4
      if (rgb !== 0) {
        data[offset] = (rgb >> 16) & 0xFF
        data[offset + 1] = (rgb >> 8) & 0xFF
        data[offset + 2] = rgb & 0xFF
        data[offset + 3] = 255
      } else {
        data[offset + 3] = 0
      }
    }
    return imageData
  }
}
