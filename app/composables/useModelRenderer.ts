import type { InventoryDefinition, LitModel } from '../../shared/types/model'
import { Rasterizer } from '../../shared/utils/rasterizer'

// OSRS uses a 2048-unit circle for rotations
const SINE = new Int32Array(2048)
const COSINE = new Int32Array(2048)
const UNIT = Math.PI / 1024

for (let i = 0; i < 2048; i++) {
  SINE[i] = Math.round(65536 * Math.sin(i * UNIT))
  COSINE[i] = Math.round(65536 * Math.cos(i * UNIT))
}

const ICON_WIDTH = 36
const ICON_HEIGHT = 32

export function useModelRenderer() {
  const rasterizer = new Rasterizer(ICON_WIDTH, ICON_HEIGHT)

  function render(
    model: LitModel,
    definition: InventoryDefinition
  ): ImageData {
    rasterizer.clear()

    const { zoom, modelRoll, modelPitch, modelYaw, offsetX, offsetY } = definition
    const vertCount = model.vertexCount

    // Transform vertices
    const projX = new Int32Array(vertCount)
    const projY = new Int32Array(vertCount)
    const projZ = new Int32Array(vertCount)

    const sinRoll = SINE[modelRoll & 2047]
    const cosRoll = COSINE[modelRoll & 2047]
    const sinPitch = SINE[modelPitch & 2047]
    const cosPitch = COSINE[modelPitch & 2047]
    const sinYaw = SINE[modelYaw & 2047]
    const cosYaw = COSINE[modelYaw & 2047]

    for (let i = 0; i < vertCount; i++) {
      let x = model.vertexX[i]
      let y = model.vertexY[i]
      let z = model.vertexZ[i]

      // Roll (Z-axis rotation, rotates XY)
      if (modelRoll !== 0) {
        const tmpX = (y * sinRoll + x * cosRoll) >> 16
        y = (y * cosRoll - x * sinRoll) >> 16
        x = tmpX
      }

      // Pitch (X-axis rotation, rotates YZ)
      if (modelPitch !== 0) {
        const tmpY = (y * cosPitch - z * sinPitch) >> 16
        z = (y * sinPitch + z * cosPitch) >> 16
        y = tmpY
      }

      // Yaw (Y-axis rotation, rotates XZ)
      if (modelYaw !== 0) {
        const tmpX = (z * sinYaw + x * cosYaw) >> 16
        z = (z * cosYaw - x * sinYaw) >> 16
        x = tmpX
      }

      // Apply zoom and project to screen coordinates
      projX[i] = ((x * zoom) >> 16) + (ICON_WIDTH >> 1) + offsetX
      projY[i] = ((y * zoom) >> 16) + (ICON_HEIGHT >> 1) + offsetY
      projZ[i] = z
    }

    // Build face depth list for sorting
    const faceCount = model.faceCount
    const faceOrder = new Int32Array(faceCount)
    const faceDepth = new Float64Array(faceCount)

    for (let i = 0; i < faceCount; i++) {
      faceOrder[i] = i
      const ia = model.faceIndices1[i]
      const ib = model.faceIndices2[i]
      const ic = model.faceIndices3[i]
      faceDepth[i] = (projZ[ia] + projZ[ib] + projZ[ic]) / 3
    }

    // Sort faces back-to-front (painter's algorithm)
    const orderArray = Array.from(faceOrder)
    orderArray.sort((a, b) => faceDepth[b] - faceDepth[a])

    // Rasterize faces
    for (let fi = 0; fi < faceCount; fi++) {
      const i = orderArray[fi]
      const ia = model.faceIndices1[i]
      const ib = model.faceIndices2[i]
      const ic = model.faceIndices3[i]

      const x0 = projX[ia]
      const y0 = projY[ia]
      const x1 = projX[ib]
      const y1 = projY[ib]
      const x2 = projX[ic]
      const y2 = projY[ic]

      // Backface culling
      const cross = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
      if (cross <= 0) continue

      const c1 = model.faceColors1[i]
      const c2 = model.faceColors2[i]
      const c3 = model.faceColors3[i]

      if (c2 === -1) {
        // Flat shading
        rasterizer.rasterFlat(y0, y1, y2, x0, x1, x2, c1)
      } else {
        // Gouraud shading
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
