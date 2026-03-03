const COMPRESSION_NONE = 0
const COMPRESSION_BZIP2 = 1
const COMPRESSION_GZIP = 2

export async function decompressCacheContainer(buffer: ArrayBuffer): Promise<Uint8Array> {
  const view = new DataView(buffer)
  const compressionType = view.getUint8(0)
  const compressedLength = view.getUint32(1, false)

  if (compressionType === COMPRESSION_NONE) {
    return new Uint8Array(buffer, 5, compressedLength)
  }

  const _decompressedLength = view.getUint32(5, false)
  const compressedData = buffer.slice(9, 9 + compressedLength)

  if (compressionType === COMPRESSION_GZIP)
    return decompressGzip(compressedData)

  if (compressionType === COMPRESSION_BZIP2)
    throw new Error('BZIP2 decompression not supported')

  throw new Error(`Unknown compression type: ${compressionType}`)
}

async function decompressGzip(data: ArrayBuffer): Promise<Uint8Array> {
  const ds = new DecompressionStream('gzip')
  const writer = ds.writable.getWriter()
  const reader = ds.readable.getReader()

  writer.write(new Uint8Array(data))
  writer.close()

  const chunks: Uint8Array[] = []
  let totalLength = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    totalLength += value.byteLength
  }

  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }

  return result
}
