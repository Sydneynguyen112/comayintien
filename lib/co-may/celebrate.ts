"use client";

// Aurelian palette — gold + cream + profit green for celebration
const AURELIAN_COLORS = ["#CD9C20", "#C8AA6F", "#D4AD54", "#3B6C4F", "#F2ECDD"];

const FIREWORK_DURATION_MS = 3200;

function randInRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export async function fireworks(): Promise<void> {
  if (typeof window === "undefined") return;

  const { default: confetti } = await import("canvas-confetti");

  const end = Date.now() + FIREWORK_DURATION_MS;

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: randInRange(0.2, 0.55) },
      colors: AURELIAN_COLORS,
      scalar: 0.9,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: randInRange(0.2, 0.55) },
      colors: AURELIAN_COLORS,
      scalar: 0.9,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();

  // Final burst from center
  setTimeout(() => {
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { x: 0.5, y: 0.5 },
      colors: AURELIAN_COLORS,
      scalar: 1.1,
    });
  }, FIREWORK_DURATION_MS / 2);
}

export const FIREWORK_DURATION = FIREWORK_DURATION_MS;

const GRAND_FIREWORK_DURATION_MS = 5500;

/**
 * Pháo hoa "đại tiệc" cho hành động nâng neo — kỷ luật chốt sạch để bậc thang lên cao hơn.
 * Bigger, longer, more bursts than the regular fireworks.
 */
export async function fireworksGrand(): Promise<void> {
  if (typeof window === "undefined") return;

  const { default: confetti } = await import("canvas-confetti");

  const end = Date.now() + GRAND_FIREWORK_DURATION_MS;

  // Liên tục bắn từ 2 bên với mật độ cao
  (function frame() {
    confetti({
      particleCount: 7,
      angle: 60,
      spread: 75,
      origin: { x: 0, y: randInRange(0.15, 0.6) },
      colors: AURELIAN_COLORS,
      scalar: 1.15,
      startVelocity: 55,
    });
    confetti({
      particleCount: 7,
      angle: 120,
      spread: 75,
      origin: { x: 1, y: randInRange(0.15, 0.6) },
      colors: AURELIAN_COLORS,
      scalar: 1.15,
      startVelocity: 55,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();

  // 3 đợt nổ từ giữa, cách quãng
  const bursts = [600, 1800, 3200];
  bursts.forEach((delay, i) => {
    setTimeout(() => {
      confetti({
        particleCount: 180 + i * 40,
        spread: 110 + i * 10,
        origin: { x: 0.5, y: 0.45 },
        colors: AURELIAN_COLORS,
        scalar: 1.3 + i * 0.1,
        startVelocity: 50,
      });
    }, delay);
  });

  // Final cascade từ trên xuống
  setTimeout(() => {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 270,
          spread: 80,
          origin: { x: randInRange(0.2, 0.8), y: 0 },
          colors: AURELIAN_COLORS,
          scalar: 1.0,
          gravity: 1.5,
        });
      }, i * 120);
    }
  }, 4500);
}

export const FIREWORK_GRAND_DURATION = GRAND_FIREWORK_DURATION_MS;
