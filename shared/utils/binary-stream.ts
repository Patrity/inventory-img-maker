export class BinaryStream {
  private view: DataView
  private _offset: number

  constructor(buffer: ArrayBuffer | Uint8Array) {
    if (buffer instanceof Uint8Array)
      this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    else
      this.view = new DataView(buffer)

    this._offset = 0
  }

  get offset(): number {
    return this._offset
  }

  set offset(value: number) {
    this._offset = value
  }

  get length(): number {
    return this.view.byteLength
  }

  get remaining(): number {
    return this.view.byteLength - this._offset
  }

  readByte(): number {
    const value = this.view.getInt8(this._offset)
    this._offset += 1
    return value
  }

  readUnsignedByte(): number {
    const value = this.view.getUint8(this._offset)
    this._offset += 1
    return value
  }

  readShort(): number {
    const value = this.view.getInt16(this._offset, false)
    this._offset += 2
    return value
  }

  readUnsignedShort(): number {
    const value = this.view.getUint16(this._offset, false)
    this._offset += 2
    return value
  }

  readInt(): number {
    const value = this.view.getInt32(this._offset, false)
    this._offset += 4
    return value
  }

  readUnsignedInt(): number {
    const value = this.view.getUint32(this._offset, false)
    this._offset += 4
    return value
  }

  readShortSmart(): number {
    const peek = this.view.getUint8(this._offset) & 0xFF
    if (peek < 128)
      return this.readUnsignedByte() - 64
    else
      return this.readUnsignedShort() - 0xC000
  }

  readUnsignedSmart(): number {
    const peek = this.view.getUint8(this._offset) & 0xFF
    if (peek < 128)
      return this.readUnsignedByte()
    else
      return this.readUnsignedShort() - 0x8000
  }

  peek(): number {
    return this.view.getUint8(this._offset) & 0xFF
  }
}
