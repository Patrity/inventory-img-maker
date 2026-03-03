export interface VertexNormal {
  x: number
  y: number
  z: number
  magnitude: number
}

export interface FaceNormal {
  x: number
  y: number
  z: number
}

export interface ModelDefinition {
  vertexCount: number
  vertexX: Int32Array
  vertexY: Int32Array
  vertexZ: Int32Array
  faceCount: number
  faceIndices1: Int32Array
  faceIndices2: Int32Array
  faceIndices3: Int32Array
  faceColors: Int16Array
  faceAlphas: Int8Array | null
  faceRenderPriorities: Int8Array | null
  faceRenderTypes: Int8Array | null
  priority: number
  numTextureFaces: number
  faceTextures: Int16Array | null
  textureCoords: Int8Array | null
  vertexNormals: VertexNormal[] | null
  faceNormals: FaceNormal[] | null
}

export interface LitModel {
  vertexCount: number
  vertexX: Int32Array
  vertexY: Int32Array
  vertexZ: Int32Array
  faceCount: number
  faceIndices1: Int32Array
  faceIndices2: Int32Array
  faceIndices3: Int32Array
  faceColors1: Int32Array
  faceColors2: Int32Array
  faceColors3: Int32Array
  facePriorities: Int8Array | null
  faceAlphas: Int8Array | null
  modelHeight: number
}

export interface InventoryDefinition {
  zoom: number
  modelRoll: number
  modelPitch: number
  modelYaw: number
  offsetX: number
  offsetY: number
}
