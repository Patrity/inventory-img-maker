import type { InventoryDefinition, LitModel } from '~~/shared/types/model'
import { Rasterizer } from '~~/shared/utils/rasterizer'

// OSRS uses a 2048-unit circle for rotations, scaled by 65536 (fixed-point)
const SINE = new Int32Array(2048)
const COSINE = new Int32Array(2048)
const UNIT = Math.PI / 1024

for (let i = 0; i < 2048; i++) {
  SINE[i] = Math.round(65536 * Math.sin(i * UNIT))
  COSINE[i] = Math.round(65536 * Math.cos(i * UNIT))
}

const ICON_WIDTH = 36
const ICON_HEIGHT = 32
const CENTER_X = 16
const CENTER_Y = 16
const RASTERIZER_ZOOM = 512

export function useModelRenderer() {
  const rasterizer = new Rasterizer(ICON_WIDTH, ICON_HEIGHT)

  function render(
    model: LitModel,
    definition: InventoryDefinition
  ): ImageData {
    rasterizer.clear()

    const { zoom, modelRoll, modelPitch, modelYaw, offsetX, offsetY } = definition
    const vertCount = model.vertexCount

    const projX = new Int32Array(vertCount)
    const projY = new Int32Array(vertCount)
    const projZ = new Int32Array(vertCount)

    // Trig for model rotations
    const sinYaw = SINE[modelYaw & 2047] ?? 0
    const cosYaw = COSINE[modelYaw & 2047] ?? 0
    const sinRoll = SINE[modelRoll & 2047] ?? 0
    const cosRoll = COSINE[modelRoll & 2047] ?? 0

    // modelPitch (xan2d) controls camera orientation
    const sinPitch = SINE[modelPitch & 2047] ?? 0
    const cosPitch = COSINE[modelPitch & 2047] ?? 0

    // Camera position derived from zoom and pitch angle
    const yCamera = (model.modelHeight >> 1) + (zoom * sinPitch >> 16) + offsetY
    const zCamera = (zoom * cosPitch >> 16) + offsetY

    for (let i = 0; i < vertCount; i++) {
      let x = model.vertexX[i] ?? 0
      let y = model.vertexY[i] ?? 0
      let z = model.vertexZ[i] ?? 0

      // Rotation 1: modelYaw (zan2d) — Z-axis, rotates XY plane
      if (modelYaw !== 0) {
        const tmpX = (y * sinYaw + x * cosYaw) >> 16
        y = (y * cosYaw - x * sinYaw) >> 16
        x = tmpX
      }

      // Rotation 2: yzRotation (X-axis) — always 0 for item sprites, skipped

      // Rotation 3: modelRoll (yan2d) — Y-axis, rotates XZ plane
      if (modelRoll !== 0) {
        const tmpX = (z * sinRoll + x * cosRoll) >> 16
        z = (z * cosRoll - x * sinRoll) >> 16
        x = tmpX
      }

      // Camera translation
      x += offsetX
      y += yCamera
      z += zCamera

      // Camera orientation (modelPitch / xan2d) — X-axis rotation on YZ
      const tmpY = (y * cosPitch - z * sinPitch) >> 16
      z = (y * sinPitch + z * cosPitch) >> 16
      y = tmpY

      // Perspective projection
      if (z > 0) {
        projX[i] = CENTER_X + ((x * RASTERIZER_ZOOM / z) | 0)
        projY[i] = CENTER_Y + ((y * RASTERIZER_ZOOM / z) | 0)
      } else {
        projX[i] = -9999
        projY[i] = -9999
      }
      projZ[i] = z
    }

    // Build face depth list for sorting
    const faceCount = model.faceCount
    const faceDepth = new Float64Array(faceCount)

    for (let i = 0; i < faceCount; i++) {
      const ia = model.faceIndices1[i] ?? 0
      const ib = model.faceIndices2[i] ?? 0
      const ic = model.faceIndices3[i] ?? 0
      faceDepth[i] = ((projZ[ia] ?? 0) + (projZ[ib] ?? 0) + (projZ[ic] ?? 0)) / 3
    }

    // Sort faces back-to-front (painter's algorithm)
    const orderArray = new Array<number>(faceCount)
    for (let i = 0; i < faceCount; i++) orderArray[i] = i
    orderArray.sort((a, b) => (faceDepth[b] ?? 0) - (faceDepth[a] ?? 0))

    // Rasterize faces
    for (let fi = 0; fi < faceCount; fi++) {
      const i = orderArray[fi]!
      const ia = model.faceIndices1[i] ?? 0
      const ib = model.faceIndices2[i] ?? 0
      const ic = model.faceIndices3[i] ?? 0

      const x0 = projX[ia] ?? 0
      const y0 = projY[ia] ?? 0
      const x1 = projX[ib] ?? 0
      const y1 = projY[ib] ?? 0
      const x2 = projX[ic] ?? 0
      const y2 = projY[ic] ?? 0

      // Backface culling
      const cross = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
      if (cross <= 0) continue

      const c1 = model.faceColors1[i] ?? 0
      const c2 = model.faceColors2[i] ?? 0
      const c3 = model.faceColors3[i] ?? 0

      if (c2 === -1) {
        rasterizer.rasterFlat(y0, y1, y2, x0, x1, x2, c1)
      } else {
        rasterizer.rasterGouraud(y0, y1, y2, x0, x1, x2, c1, c2, c3)
      }
    }

    return rasterizer.toImageData()
  }

  function renderToCanvas(
    canvas: HTMLCanvasElement,
    model: LitModel,
    definition: InventoryDefinition
  ) {
    canvas.width = ICON_WIDTH
    canvas.height = ICON_HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = render(model, definition)
    ctx.putImageData(imageData, 0, 0)
  }

  function renderScaled(
    canvas: HTMLCanvasElement,
    sourceCanvas: HTMLCanvasElement,
    scale: number = 10
  ) {
    canvas.width = ICON_WIDTH * scale
    canvas.height = ICON_HEIGHT * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false
    ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height)
  }

  return {
    render,
    renderToCanvas,
    renderScaled,
    ICON_WIDTH,
    ICON_HEIGHT
  }
}
