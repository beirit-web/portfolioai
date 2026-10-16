function wavFile(name = "Meine Deutschübung.wav") {
  const sampleRate = 8000, frames = sampleRate * 2;
  const buffer = Buffer.alloc(44 + frames * 2);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write("data", 36);
  buffer.writeUInt32LE(frames * 2, 40);
  for (let frame = 0; frame < frames; frame++) buffer.writeInt16LE(Math.round(1000 * Math.sin(frame * Math.PI * 2 * 440 / sampleRate)), 44 + frame * 2);
  return { name, mimeType: "audio/wav", buffer };
}

module.exports = { wavFile };
