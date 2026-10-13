/** Динамичный фон: плавающие красные пятна, движущаяся сетка и всплывающие частицы. */
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 7.3 + 5) % 100}%`,
  size: 4 + ((i * 5) % 9),
  duration: 12 + ((i * 3) % 14),
  delay: -((i * 2.7) % 16),
}));

export function DynamicBackground() {
  return (
    <div className="bg-dynamic" aria-hidden="true">
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
      <div className="grid-overlay" />
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="particle"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
