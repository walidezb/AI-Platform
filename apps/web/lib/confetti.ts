import confetti from 'canvas-confetti';

export function fireMilestoneConfetti() {
  const duration = 3000;
  const end = Date.now() + duration;

  const colors = ['#6366f1', '#818cf8', '#a5b4fc', '#34d399', '#fbbf24'];

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

export function firePathCompleteConfetti() {
  // More dramatic — full burst for path completion
  confetti({
    particleCount: 200,
    spread: 100,
    origin: { y: 0.5 },
    colors: ['#6366f1', '#818cf8', '#34d399', '#fbbf24', '#f472b6'],
  });
  setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
    });
  }, 600);
}

export function fireSuccessConfetti() {
  // Small burst for exercise pass
  confetti({
    particleCount: 60,
    spread: 60,
    origin: { y: 0.7 },
    colors: ['#34d399', '#6366f1', '#fbbf24'],
  });
}
