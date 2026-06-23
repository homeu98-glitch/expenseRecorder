"use client";

type ConfettiBurstProps = {
  active: boolean;
};

const COLORS = ["#2563eb", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4"];

export default function ConfettiBurst({ active }: ConfettiBurstProps) {
  if (!active) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-[90]">
      {Array.from({ length: 24 }).map((_, index) => {
        const left = 8 + (index % 6) * 14 + ((index * 7) % 5);
        const delay = (index % 8) * 0.04;
        const duration = 0.9 + (index % 5) * 0.18;
        const color = COLORS[index % COLORS.length];
        const rotate = (index * 31) % 360;

        return (
          <span
            key={index}
            className="absolute top-0 block w-3 h-5 rounded-sm"
            style={{
              left: `${left}%`,
              backgroundColor: color,
              animation: `confetti-fall ${duration}s linear ${delay}s forwards`,
              transform: `translateY(-20px) rotate(${rotate}deg)`,
            }}
          />
        );
      })}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            opacity: 0;
            transform: translateY(-20px) rotate(0deg) scale(0.8);
          }
          10% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(95vh) rotate(540deg) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
