import type { LitModel, ModelDefinition } from '~~/shared/types/model'
import { BinaryStream } from '~~/shared/utils/binary-stream'
import { adjustLightness } from '~~/shared/utils/rs-colors'

export function parseModel(data: Uint8Array): ModelDefinition {
  const stream = new BinaryStream(data)

  const lastByte1 = data[data.length - 1]
  const lastByte2 = data[data.length - 2]

  // Detect format from last 2 bytes (signed)
  const sig1 = lastByte2 > 127 ? lastByte2 - 256 : lastByte2
  const sig2 = lastByte1 > 127 ? lastByte1 - 256 : lastByte1

  if (sig1 === -1 && sig2 === -3)
    return decodeType3(stream, data)
  if (sig1 === -1 && sig2 === -2)
    return decodeType2(stream, data)
  if (sig1 === -1 && sig2 === -1)
    return decodeType1(stream, data)
  return decodeOldFormat(stream, data)
}

function decodeType3(stream: BinaryStream, data: Uint8Array): ModelDefinition {
  const len = data.length

  // Read footer (26 bytes from end)
  stream.offset = len - 26
  const vertexCount = stream.readUnsignedShort()
  const faceCount = stream.readUnsignedShort()
  const numTextureFaces = stream.readUnsignedByte()
  const hasFaceRenderTypes = stream.readUnsignedByte()
  const faceRenderPriority = stream.readUnsignedByte()
  const hasFaceTransparencies = stream.readUnsignedByte()
  const hasPackedTransparencyVertexGroups = stream.readUnsignedByte()
  const hasFaceTextures = stream.readUnsignedByte()
  const _hasPackedVertexGroups = stream.readUnsignedByte()
  const _hasAnimaya = stream.readUnsignedByte()
  const vertexXDataLength = stream.readUnsignedShort()
  const vertexYDataLength = stream.readUnsignedShort()
  const vertexZDataLength = stream.readUnsignedShort()
  const faceIndexDataLength = stream.readUnsignedShort()
  const faceTextureIndexDataLength = stream.readUnsignedShort()
  const packedVertexGroupsDataLength = stream.readUnsignedShort()

  // Count texture types
  let simpleTexCount = 0
  let complexTexCount = 0
  let _complexTex2Count = 0
  const textureRenderTypes = new Int8Array(numTextureFaces)

  if (numTextureFaces > 0) {
    stream.offset = 0
    for (let i = 0; i < numTextureFaces; i++) {
      const type = stream.readByte()
      textureRenderTypes[i] = type
      if (type === 0) simpleTexCount++
      else if (type >= 1 && type <= 3) complexTexCount++
      if (type === 2) _complexTex2Count++
    }
  }

  // Calculate data section offsets
  let offset = numTextureFaces + vertexCount

  const faceRenderTypesOffset = offset
  if (hasFaceRenderTypes === 1) offset += faceCount

  const faceIndexTypesOffset = offset
  offset += faceCount

  const faceRenderPrioritiesOffset = offset
  if (faceRenderPriority === 255) offset += faceCount

  const _packedTransparencyVGOffset = offset
  if (hasPackedTransparencyVertexGroups === 1) offset += faceCount

  const _packedVertexGroupsOffset = offset
  offset += packedVertexGroupsDataLength

  const faceTransparenciesOffset = offset
  if (hasFaceTransparencies === 1) offset += faceCount

  const faceIndexDataOffset = offset
  offset += faceIndexDataLength

  const faceTexturesOffset = offset
  if (hasFaceTextures === 1) offset += faceCount * 2

  const faceTextureIndexDataOffset = offset
  offset += faceTextureIndexDataLength

  const faceColorsOffset = offset
  offset += faceCount * 2

  const vertexXOffset = offset
  offset += vertexXDataLength

  const vertexYOffset = offset
  offset += vertexYDataLength

  const vertexZOffset = offset
  offset += vertexZDataLength

  const simpleTexOffset = offset
  offset += simpleTexCount * 6

  const _complexTex1Offset = offset
  offset += complexTexCount * 6

  const _complexTex2Offset = offset
  offset += complexTexCount * 6

  const _complexTex3Offset = offset
  offset += complexTexCount * 2

  const _complexTex4Offset = offset
  offset += complexTexCount

  const _complexTex5Offset = offset

  // Allocate arrays
  const def: ModelDefinition = {
    vertexCount,
    vertexX: new Int32Array(vertexCount),
    vertexY: new Int32Array(vertexCount),
    vertexZ: new Int32Array(vertexCount),
    faceCount,
    faceIndices1: new Int32Array(faceCount),
    faceIndices2: new Int32Array(faceCount),
    faceIndices3: new Int32Array(faceCount),
    faceColors: new Int16Array(faceCount),
    faceAlphas: hasFaceTransparencies === 1 ? new Int8Array(faceCount) : null,
    faceRenderPriorities: faceRenderPriority === 255 ? new Int8Array(faceCount) : null,
    faceRenderTypes: hasFaceRenderTypes === 1 ? new Int8Array(faceCount) : null,
    priority: faceRenderPriority === 255 ? 0 : faceRenderPriority,
    numTextureFaces,
    faceTextures: hasFaceTextures === 1 ? new Int16Array(faceCount) : null,
    textureCoords: null,
    vertexNormals: null,
    faceNormals: null
  }

  if (hasFaceTextures === 1 && numTextureFaces > 0)
    def.textureCoords = new Int8Array(faceCount)

  // Decode vertices (delta encoding)
  stream.offset = numTextureFaces
  const vertexFlagsStream = new BinaryStream(data)
  vertexFlagsStream.offset = numTextureFaces

  const vertexXStream = new BinaryStream(data)
  vertexXStream.offset = vertexXOffset

  const vertexYStream = new BinaryStream(data)
  vertexYStream.offset = vertexYOffset

  const vertexZStream = new BinaryStream(data)
  vertexZStream.offset = vertexZOffset

  let prevX = 0, prevY = 0, prevZ = 0
  for (let i = 0; i < vertexCount; i++) {
    const flags = vertexFlagsStream.readUnsignedByte()
    let dx = 0, dy = 0, dz = 0
    if (flags & 1) dx = vertexXStream.readShortSmart()
    if (flags & 2) dy = vertexYStream.readShortSmart()
    if (flags & 4) dz = vertexZStream.readShortSmart()
    def.vertexX[i] = prevX + dx
    def.vertexY[i] = prevY + dy
    def.vertexZ[i] = prevZ + dz
    prevX = def.vertexX[i]
    prevY = def.vertexY[i]
    prevZ = def.vertexZ[i]
  }

  // Decode face attributes
  const faceColorsStream = new BinaryStream(data)
  faceColorsStream.offset = faceColorsOffset

  const faceRenderTypesStream = new BinaryStream(data)
  faceRenderTypesStream.offset = faceRenderTypesOffset

  const facePrioritiesStream = new BinaryStream(data)
  facePrioritiesStream.offset = faceRenderPrioritiesOffset

  const faceTransparenciesStream = new BinaryStream(data)
  faceTransparenciesStream.offset = faceTransparenciesOffset

  const faceTexturesStream = new BinaryStream(data)
  faceTexturesStream.offset = faceTexturesOffset

  const faceTextureIndexStream = new BinaryStream(data)
  faceTextureIndexStream.offset = faceTextureIndexDataOffset

  for (let i = 0; i < faceCount; i++) {
    def.faceColors[i] = faceColorsStream.readUnsignedShort()
    if (def.faceRenderTypes) def.faceRenderTypes[i] = faceRenderTypesStream.readByte()
    if (def.faceRenderPriorities) def.faceRenderPriorities[i] = facePrioritiesStream.readByte()
    if (def.faceAlphas) def.faceAlphas[i] = faceTransparenciesStream.readByte()
    if (def.faceTextures) {
      def.faceTextures[i] = faceTexturesStream.readUnsignedShort() - 1
      if (def.textureCoords && def.faceTextures[i] !== -1)
        def.textureCoords[i] = faceTextureIndexStream.readUnsignedByte() - 1
    }
  }

  // Decode face indices (triangle strip compression)
  const faceIndexStream = new BinaryStream(data)
  faceIndexStream.offset = faceIndexDataOffset

  const faceIndexTypeStream = new BinaryStream(data)
  faceIndexTypeStream.offset = faceIndexTypesOffset

  let a = 0, b = 0, c = 0, lastC = 0
  for (let i = 0; i < faceCount; i++) {
    const type = faceIndexTypeStream.readUnsignedByte()

    if (type === 1) {
      a = faceIndexStream.readShortSmart() + lastC
      b = faceIndexStream.readShortSmart() + a
      c = faceIndexStream.readShortSmart() + b
      lastC = c
      def.faceIndices1[i] = a
      def.faceIndices2[i] = b
      def.faceIndices3[i] = c
    } else if (type === 2) {
      b = c
      c = faceIndexStream.readShortSmart() + lastC
      lastC = c
      def.faceIndices1[i] = a
      def.faceIndices2[i] = b
      def.faceIndices3[i] = c
    } else if (type === 3) {
      a = c
      c = faceIndexStream.readShortSmart() + lastC
      lastC = c
      def.faceIndices1[i] = a
      def.faceIndices2[i] = b
      def.faceIndices3[i] = c
    } else if (type === 4) {
      const temp = a
      a = b
      b = temp
      c = faceIndexStream.readShortSmart() + lastC
      lastC = c
      def.faceIndices1[i] = a
      def.faceIndices2[i] = temp
      def.faceIndices3[i] = c
    }
  }

  // Decode texture triangle indices
  if (numTextureFaces > 0) {
    const texStream = new BinaryStream(data)
    texStream.offset = simpleTexOffset

    for (let i = 0; i < numTextureFaces; i++) {
      if ((textureRenderTypes[i] & 0xFF) === 0) {
        texStream.readUnsignedShort()
        texStream.readUnsignedShort()
        texStream.readUnsignedShort()
      }
    }
  }

  return def
}

function decodeType2(stream: BinaryStream, data: Uint8Array): ModelDefinition {
  return decodeType1or2(stream, data, false)
}

function decodeType1(stream: BinaryStream, data: Uint8Array): ModelDefinition {
  return decodeType1or2(stream, data, true)
}

function decodeType1or2(_stream: BinaryStream, data: Uint8Array, isType1: boolean): ModelDefinition {
  const len = data.length

  // Read footer (23 bytes from end)
  const footer = new BinaryStream(data)
  footer.offset = len - 23
  const vertexCount = footer.readUnsignedShort()
  const faceCount = footer.readUnsignedShort()
  const numTextureFaces = footer.readUnsignedByte()
  const hasFaceRenderTypes = footer.readUnsignedByte()
  const faceRenderPriority = footer.readUnsignedByte()
  const hasFaceTransparencies = footer.readUnsignedByte()
  const hasPackedTransparencyVG = footer.readUnsignedByte()
  const hasFaceTextures = footer.readUnsignedByte()
  const hasPackedVertexGroups = footer.readUnsignedByte()
  const vertexXDataLength = footer.readUnsignedShort()
  const vertexYDataLength = footer.readUnsignedShort()
  const _vertexZDataLength = footer.readUnsignedShort()
  const faceIndexDataLength = footer.readUnsignedShort()
  const faceTextureIndexDataLength = footer.readUnsignedShort()

  // Count texture types (Type 1 has render types at the start)
  const _textureRenderTypes = new Int8Array(numTextureFaces)

  if (isType1 && numTextureFaces > 0) {
    const s = new BinaryStream(data)
    s.offset = 0
    for (let i = 0; i < numTextureFaces; i++) {
      _textureRenderTypes[i] = s.readByte()
    }
  }

  // Calculate offsets
  let offset = isType1 ? numTextureFaces : 0
  offset += vertexCount

  const faceRenderTypesOffset = offset
  if (hasFaceRenderTypes === 1) offset += faceCount

  const faceIndexTypesOffset = offset
  offset += faceCount

  const faceRenderPrioritiesOffset = offset
  if (faceRenderPriority === 255) offset += faceCount

  const _packedTransparencyVGOffset2 = offset
  if (hasPackedTransparencyVG === 1) offset += faceCount

  const _packedVertexGroupsOffset2 = offset
  if (hasPackedVertexGroups === 1) offset += vertexCount

  const faceTransparenciesOffset = offset
  if (hasFaceTransparencies === 1) offset += faceCount

  const faceIndexDataOffset = offset
  offset += faceIndexDataLength

  const faceTexturesOffset = offset
  if (hasFaceTextures === 1) offset += faceCount * 2

  const faceTextureIndexDataOffset = offset
  offset += faceTextureIndexDataLength

  const faceColorsOffset = offset
  offset += faceCount * 2

  const vertexXOffset = offset
  offset += vertexXDataLength

  const vertexYOffset = offset
  offset += vertexYDataLength

  const vertexZOffset = offset

  // Allocate
  const def: ModelDefinition = {
    vertexCount,
    vertexX: new Int32Array(vertexCount),
    vertexY: new Int32Array(vertexCount),
    vertexZ: new Int32Array(vertexCount),
    faceCount,
    faceIndices1: new Int32Array(faceCount),
    faceIndices2: new Int32Array(faceCount),
    faceIndices3: new Int32Array(faceCount),
    faceColors: new Int16Array(faceCount),
    faceAlphas: hasFaceTransparencies === 1 ? new Int8Array(faceCount) : null,
    faceRenderPriorities: faceRenderPriority === 255 ? new Int8Array(faceCount) : null,
    faceRenderTypes: hasFaceRenderTypes === 1 ? new Int8Array(faceCount) : null,
    priority: faceRenderPriority === 255 ? 0 : faceRenderPriority,
    numTextureFaces,
    faceTextures: hasFaceTextures === 1 ? new Int16Array(faceCount) : null,
    textureCoords: null,
    vertexNormals: null,
    faceNormals: null
  }

  if (hasFaceTextures === 1 && numTextureFaces > 0)
    def.textureCoords = new Int8Array(faceCount)

  // Decode vertices
  const vertexFlagsStart = isType1 ? numTextureFaces : 0
  const vfStream = new BinaryStream(data)
  vfStream.offset = vertexFlagsStart

  const vxStream = new BinaryStream(data)
  vxStream.offset = vertexXOffset

  const vyStream = new BinaryStream(data)
  vyStream.offset = vertexYOffset

  const vzStream = new BinaryStream(data)
  vzStream.offset = vertexZOffset

  let prevX = 0, prevY = 0, prevZ = 0
  for (let i = 0; i < vertexCount; i++) {
    const flags = vfStream.readUnsignedByte()
    let dx = 0, dy = 0, dz = 0
    if (flags & 1) dx = vxStream.readShortSmart()
    if (flags & 2) dy = vyStream.readShortSmart()
    if (flags & 4) dz = vzStream.readShortSmart()
    def.vertexX[i] = prevX + dx
    def.vertexY[i] = prevY + dy
    def.vertexZ[i] = prevZ + dz
    prevX = def.vertexX[i]
    prevY = def.vertexY[i]
    prevZ = def.vertexZ[i]
  }

  // Decode face attributes
  const fcStream = new BinaryStream(data)
  fcStream.offset = faceColorsOffset
  const frtStream = new BinaryStream(data)
  frtStream.offset = faceRenderTypesOffset
  const fpStream = new BinaryStream(data)
  fpStream.offset = faceRenderPrioritiesOffset
  const ftStream = new BinaryStream(data)
  ftStream.offset = faceTransparenciesOffset
  const fTexStream = new BinaryStream(data)
  fTexStream.offset = faceTexturesOffset
  const ftiStream = new BinaryStream(data)
  ftiStream.offset = faceTextureIndexDataOffset

  for (let i = 0; i < faceCount; i++) {
    def.faceColors[i] = fcStream.readUnsignedShort()
    if (def.faceRenderTypes) def.faceRenderTypes[i] = frtStream.readByte()
    if (def.faceRenderPriorities) def.faceRenderPriorities[i] = fpStream.readByte()
    if (def.faceAlphas) def.faceAlphas[i] = ftStream.readByte()
    if (def.faceTextures) {
      def.faceTextures[i] = fTexStream.readUnsignedShort() - 1
      if (def.textureCoords && def.faceTextures[i] !== -1)
        def.textureCoords[i] = ftiStream.readUnsignedByte() - 1
    }
  }

  // Decode face indices
  const fiStream = new BinaryStream(data)
  fiStream.offset = faceIndexDataOffset
  const fitStream = new BinaryStream(data)
  fitStream.offset = faceIndexTypesOffset

  let a = 0, b = 0, c = 0, lastC = 0
  for (let i = 0; i < faceCount; i++) {
    const type = fitStream.readUnsignedByte()
    if (type === 1) {
      a = fiStream.readShortSmart() + lastC
      b = fiStream.readShortSmart() + a
      c = fiStream.readShortSmart() + b
      lastC = c
    } else if (type === 2) {
      b = c
      c = fiStream.readShortSmart() + lastC
      lastC = c
    } else if (type === 3) {
      a = c
      c = fiStream.readShortSmart() + lastC
      lastC = c
    } else if (type === 4) {
      const temp = a
      a = b
      b = temp
      c = fiStream.readShortSmart() + lastC
      lastC = c
      def.faceIndices1[i] = a
      def.faceIndices2[i] = temp
      def.faceIndices3[i] = c
      continue
    }
    def.faceIndices1[i] = a
    def.faceIndices2[i] = b
    def.faceIndices3[i] = c
  }

  return def
}

function decodeOldFormat(_stream: BinaryStream, data: Uint8Array): ModelDefinition {
  const len = data.length

  // Read footer (18 bytes from end)
  const footer = new BinaryStream(data)
  footer.offset = len - 18
  const vertexCount = footer.readUnsignedShort()
  const faceCount = footer.readUnsignedShort()
  const _numTextureFaces = footer.readUnsignedByte()
  const isTextured = footer.readUnsignedByte()
  const faceRenderPriority = footer.readUnsignedByte()
  const hasFaceTransparencies = footer.readUnsignedByte()
  const hasPackedTransparencyVG = footer.readUnsignedByte()
  const hasPackedVertexGroups = footer.readUnsignedByte()
  const vertexXDataLength = footer.readUnsignedShort()
  const vertexYDataLength = footer.readUnsignedShort()
  const _vertexZDataLength = footer.readUnsignedShort()
  const faceIndexDataLength = footer.readUnsignedShort()

  let offset = vertexCount

  const faceIndexTypesOffset = offset
  offset += faceCount

  const faceRenderPrioritiesOffset = offset
  if (faceRenderPriority === 255) offset += faceCount

  const _packedTransparencyVGOffset3 = offset
  if (hasPackedTransparencyVG === 1) offset += faceCount

  const texturedFlagOffset = offset
  if (isTextured === 1) offset += faceCount

  const _packedVertexGroupsOffset3 = offset
  if (hasPackedVertexGroups === 1) offset += vertexCount

  const faceTransparenciesOffset = offset
  if (hasFaceTransparencies === 1) offset += faceCount

  const faceIndexDataOffset = offset
  offset += faceIndexDataLength

  const faceColorsOffset = offset
  offset += faceCount * 2

  const vertexXOffset = offset
  offset += vertexXDataLength

  const vertexYOffset = offset
  offset += vertexYDataLength

  const vertexZOffset = offset

  const def: ModelDefinition = {
    vertexCount,
    vertexX: new Int32Array(vertexCount),
    vertexY: new Int32Array(vertexCount),
    vertexZ: new Int32Array(vertexCount),
    faceCount,
    faceIndices1: new Int32Array(faceCount),
    faceIndices2: new Int32Array(faceCount),
    faceIndices3: new Int32Array(faceCount),
    faceColors: new Int16Array(faceCount),
    faceAlphas: hasFaceTransparencies === 1 ? new Int8Array(faceCount) : null,
    faceRenderPriorities: faceRenderPriority === 255 ? new Int8Array(faceCount) : null,
    faceRenderTypes: null,
    priority: faceRenderPriority === 255 ? 0 : faceRenderPriority,
    numTextureFaces: 0,
    faceTextures: null,
    textureCoords: null,
    vertexNormals: null,
    faceNormals: null
  }

  // Decode vertices
  const vfStream = new BinaryStream(data)
  vfStream.offset = 0
  const vxStream = new BinaryStream(data)
  vxStream.offset = vertexXOffset
  const vyStream = new BinaryStream(data)
  vyStream.offset = vertexYOffset
  const vzStream = new BinaryStream(data)
  vzStream.offset = vertexZOffset

  let prevX = 0, prevY = 0, prevZ = 0
  for (let i = 0; i < vertexCount; i++) {
    const flags = vfStream.readUnsignedByte()
    let dx = 0, dy = 0, dz = 0
    if (flags & 1) dx = vxStream.readShortSmart()
    if (flags & 2) dy = vyStream.readShortSmart()
    if (flags & 4) dz = vzStream.readShortSmart()
    def.vertexX[i] = prevX + dx
    def.vertexY[i] = prevY + dy
    def.vertexZ[i] = prevZ + dz
    prevX = def.vertexX[i]
    prevY = def.vertexY[i]
    prevZ = def.vertexZ[i]
  }

  // Decode face colors
  const fcStream = new BinaryStream(data)
  fcStream.offset = faceColorsOffset
  for (let i = 0; i < faceCount; i++)
    def.faceColors[i] = fcStream.readUnsignedShort()

  // Decode priorities
  if (def.faceRenderPriorities) {
    const fpStream = new BinaryStream(data)
    fpStream.offset = faceRenderPrioritiesOffset
    for (let i = 0; i < faceCount; i++)
      def.faceRenderPriorities[i] = fpStream.readByte()
  }

  // Decode transparencies
  if (def.faceAlphas) {
    const ftStream = new BinaryStream(data)
    ftStream.offset = faceTransparenciesOffset
    for (let i = 0; i < faceCount; i++)
      def.faceAlphas[i] = ftStream.readByte()
  }

  // Decode textured faces flag
  if (isTextured === 1) {
    def.faceRenderTypes = new Int8Array(faceCount)
    def.faceTextures = new Int16Array(faceCount).fill(-1)
    def.textureCoords = new Int8Array(faceCount)

    const tfStream = new BinaryStream(data)
    tfStream.offset = texturedFlagOffset

    for (let i = 0; i < faceCount; i++) {
      const flags = tfStream.readUnsignedByte()
      if (flags & 1) def.faceRenderTypes[i] = 1
      if (flags & 2) {
        def.textureCoords[i] = flags >> 2
        def.faceTextures[i] = def.faceColors[i]
        def.faceColors[i] = 127
      }
    }
  }

  // Decode face indices
  const fiStream = new BinaryStream(data)
  fiStream.offset = faceIndexDataOffset
  const fitStream = new BinaryStream(data)
  fitStream.offset = faceIndexTypesOffset

  let a = 0, b = 0, c = 0, lastC2 = 0
  for (let i = 0; i < faceCount; i++) {
    const type = fitStream.readUnsignedByte()
    if (type === 1) {
      a = fiStream.readShortSmart() + lastC2
      b = fiStream.readShortSmart() + a
      c = fiStream.readShortSmart() + b
      lastC2 = c
    } else if (type === 2) {
      b = c
      c = fiStream.readShortSmart() + lastC2
      lastC2 = c
    } else if (type === 3) {
      a = c
      c = fiStream.readShortSmart() + lastC2
      lastC2 = c
    } else if (type === 4) {
      const temp = a
      a = b
      b = temp
      c = fiStream.readShortSmart() + lastC2
      lastC2 = c
      def.faceIndices1[i] = a
      def.faceIndices2[i] = temp
      def.faceIndices3[i] = c
      continue
    }
    def.faceIndices1[i] = a
    def.faceIndices2[i] = b
    def.faceIndices3[i] = c
  }

  return def
}

export function computeNormals(def: ModelDefinition): void {
  if (def.vertexNormals) return

  def.vertexNormals = new Array(def.vertexCount)
  for (let i = 0; i < def.vertexCount; i++)
    def.vertexNormals[i] = { x: 0, y: 0, z: 0, magnitude: 0 }

  for (let i = 0; i < def.faceCount; i++) {
    const ia = def.faceIndices1[i]
    const ib = def.faceIndices2[i]
    const ic = def.faceIndices3[i]

    // Edge vectors
    const xA = def.vertexX[ib] - def.vertexX[ia]
    const yA = def.vertexY[ib] - def.vertexY[ia]
    const zA = def.vertexZ[ib] - def.vertexZ[ia]
    const xB = def.vertexX[ic] - def.vertexX[ia]
    const yB = def.vertexY[ic] - def.vertexY[ia]
    const zB = def.vertexZ[ic] - def.vertexZ[ia]

    // Cross product
    let nx = yA * zB - yB * zA
    let ny = zA * xB - zB * xA
    let nz = xA * yB - xB * yA

    // Clamp to prevent overflow
    while (nx > 8192 || ny > 8192 || nz > 8192
      || nx < -8192 || ny < -8192 || nz < -8192) {
      nx >>= 1
      ny >>= 1
      nz >>= 1
    }

    // Normalize and scale to 256
    let length = Math.sqrt(nx * nx + ny * ny + nz * nz) | 0
    if (length <= 0) length = 1
    nx = (nx * 256 / length) | 0
    ny = (ny * 256 / length) | 0
    nz = (nz * 256 / length) | 0

    const renderType = def.faceRenderTypes ? def.faceRenderTypes[i] : 0

    if (renderType === 0) {
      def.vertexNormals[ia].x += nx
      def.vertexNormals[ia].y += ny
      def.vertexNormals[ia].z += nz
      def.vertexNormals[ia].magnitude++

      def.vertexNormals[ib].x += nx
      def.vertexNormals[ib].y += ny
      def.vertexNormals[ib].z += nz
      def.vertexNormals[ib].magnitude++

      def.vertexNormals[ic].x += nx
      def.vertexNormals[ic].y += ny
      def.vertexNormals[ic].z += nz
      def.vertexNormals[ic].magnitude++
    } else if (renderType === 1) {
      if (!def.faceNormals) def.faceNormals = new Array(def.faceCount)
      def.faceNormals[i] = { x: nx, y: ny, z: nz }
    }
  }
}

export function lightModel(
  def: ModelDefinition,
  ambient: number = 64,
  contrast: number = 768,
  lightX: number = -50,
  lightY: number = -10,
  lightZ: number = -50
): LitModel {
  computeNormals(def)

  const magnitude = Math.sqrt(lightX * lightX + lightY * lightY + lightZ * lightZ) | 0

  const lit: LitModel = {
    vertexCount: def.vertexCount,
    vertexX: def.vertexX,
    vertexY: def.vertexY,
    vertexZ: def.vertexZ,
    faceCount: def.faceCount,
    faceIndices1: def.faceIndices1,
    faceIndices2: def.faceIndices2,
    faceIndices3: def.faceIndices3,
    faceColors1: new Int32Array(def.faceCount),
    faceColors2: new Int32Array(def.faceCount),
    faceColors3: new Int32Array(def.faceCount),
    facePriorities: def.faceRenderPriorities,
    faceAlphas: def.faceAlphas
  }

  for (let i = 0; i < def.faceCount; i++) {
    const color = def.faceColors[i] & 0xFFFF
    const renderType = def.faceRenderTypes ? def.faceRenderTypes[i] : 0

    if (renderType === 1) {
      const fn = def.faceNormals?.[i]
      if (fn) {
        let light = ambient + (lightX * fn.x + lightY * fn.y + lightZ * fn.z) / (magnitude * (fn.x * fn.x + fn.y * fn.y + fn.z * fn.z > 0 ? 1 : 0) + 1)
        light = (contrast * light) >> 8
        lit.faceColors1[i] = adjustLightness(color, light)
        lit.faceColors2[i] = -1
        lit.faceColors3[i] = -1
      } else {
        lit.faceColors1[i] = color
        lit.faceColors2[i] = -1
        lit.faceColors3[i] = -1
      }
    } else if (renderType === 0) {
      const ia = def.faceIndices1[i]
      const ib = def.faceIndices2[i]
      const ic = def.faceIndices3[i]

      const na = def.vertexNormals![ia]
      const nb = def.vertexNormals![ib]
      const nc = def.vertexNormals![ic]

      let lightA = ambient + (lightX * na.x + lightY * na.y + lightZ * na.z) / (magnitude * na.magnitude + 1)
      lightA = (contrast * lightA) >> 8
      lit.faceColors1[i] = adjustLightness(color, lightA)

      let lightB = ambient + (lightX * nb.x + lightY * nb.y + lightZ * nb.z) / (magnitude * nb.magnitude + 1)
      lightB = (contrast * lightB) >> 8
      lit.faceColors2[i] = adjustLightness(color, lightB)

      let lightC = ambient + (lightX * nc.x + lightY * nc.y + lightZ * nc.z) / (magnitude * nc.magnitude + 1)
      lightC = (contrast * lightC) >> 8
      lit.faceColors3[i] = adjustLightness(color, lightC)
    } else {
      lit.faceColors1[i] = color
      lit.faceColors2[i] = -1
      lit.faceColors3[i] = -1
    }
  }

  return lit
}
