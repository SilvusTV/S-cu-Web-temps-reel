// Exercice TP1 : TCP est un flux d'octets, pas une suite de messages.
export function encodeFrame(payload: Buffer): Buffer {
  const header = Buffer.alloc(4)
  header.writeUInt32BE(payload.length)
  return Buffer.concat([header, payload])
}
export class FrameDecoder {
  private buffer: Buffer = Buffer.alloc(0)
  constructor(readonly maximum = 4096) {}
  push(chunk: Buffer): Buffer[] {
    this.buffer = Buffer.concat([this.buffer, chunk])
    const frames: Buffer[] = []
    while (this.buffer.length >= 4) {
      const length = this.buffer.readUInt32BE()
      if (length > this.maximum) { this.buffer = Buffer.alloc(0); throw new Error('Frame trop grande') }
      if (this.buffer.length < length + 4) break
      frames.push(this.buffer.subarray(4, length + 4))
      this.buffer = this.buffer.subarray(length + 4)
    }
    return frames
  }
}

