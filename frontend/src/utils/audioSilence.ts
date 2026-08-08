const MIN_DURATION_SECONDS = 0.5
const SILENCE_AMPLITUDE_THRESHOLD = 0.01

/**
 * Whisper et Gemini ne renvoient pas "rien" face à un silence : ils
 * hallucinent la suite la plus probable vue à l'entraînement (souvent des
 * outros YouTube du type "abonnez-vous à la chaîne"). On détecte le silence
 * avant l'envoi pour éviter de générer une note à partir de ce bruit.
 */
export async function isSilentAudio(blob: Blob): Promise<boolean> {
  try {
    const arrayBuffer = await blob.arrayBuffer()
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const audioCtx = new AudioContextClass()
    let audioBuffer: AudioBuffer
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
    } finally {
      void audioCtx.close()
    }

    if (audioBuffer.duration < MIN_DURATION_SECONDS) return true

    let maxAmplitude = 0
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const data = audioBuffer.getChannelData(channel)
      for (let i = 0; i < data.length; i += 50) {
        const abs = Math.abs(data[i])
        if (abs > maxAmplitude) maxAmplitude = abs
      }
    }
    return maxAmplitude < SILENCE_AMPLITUDE_THRESHOLD
  } catch {
    // Format non décodable par le navigateur (rare) : on laisse passer
    // plutôt que de bloquer un envoi potentiellement valide.
    return false
  }
}
