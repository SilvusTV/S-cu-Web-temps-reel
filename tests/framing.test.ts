import test from 'node:test'
import assert from 'node:assert/strict'
import { FrameDecoder, encodeFrame } from '../src/realtime/framing.ts'
test('TP1 : header fragmenté, deux messages coalescés, borne de frame', () => {
  const decoder = new FrameDecoder()
  const stream = Buffer.concat([encodeFrame(Buffer.from('un')), encodeFrame(Buffer.from('deux'))])
  assert.deepEqual(decoder.push(stream.subarray(0,2)), [])
  assert.deepEqual(decoder.push(stream.subarray(2,5)), [])
  assert.deepEqual(decoder.push(stream.subarray(5)).map(b => b.toString()), ['un','deux'])
  const oversized = Buffer.alloc(4); oversized.writeUInt32BE(4097)
  assert.throws(() => decoder.push(oversized), /grande/)
})

