function getAudioContextClass() {
  return window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

function finishAudio(context: AudioContext, delayMs: number) {
  window.setTimeout(() => {
    void context.close().catch(() => undefined);
  }, delayMs);
}

export function playSuccessSound() {
  if (typeof window === "undefined") {
    return;
  }

  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) {
    return;
  }

  const context = new AudioContextClass();
  void context.resume().catch(() => undefined);
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(660, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(990, context.currentTime + 0.12);
  gainNode.gain.setValueAtTime(0.0001, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.34);
  finishAudio(context, 380);
}

export function playPaidSound() {
  if (typeof window === "undefined") {
    return;
  }

  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) {
    return;
  }

  const context = new AudioContextClass();
  void context.resume().catch(() => undefined);
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(523.25, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(783.99, context.currentTime + 0.1);
  oscillator.frequency.exponentialRampToValueAtTime(1046.5, context.currentTime + 0.22);
  gainNode.gain.setValueAtTime(0.0001, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.42);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.44);
  finishAudio(context, 500);
}
