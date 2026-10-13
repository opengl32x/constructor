/**
 * Логотип NARXOZFAB.
 * «NARXOZ» — фирменное начертание Нархоз Колледж (красный, /public/narxoz-logo.png),
 * «FAB» — чёрный, Montserrat ExtraBold (ближайший к фирменному шрифту).
 * Размер задаётся через font-size (className="text-xl" и т.п.): высота заглавных
 * букв «FAB» подогнана под высоту «NARXOZ».
 */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap leading-none ${className}`}
      aria-label="NarxozFab"
    >
      <img
        src="/narxoz-logo.png"
        alt=""
        draggable={false}
        style={{ display: 'inline', height: '1.145em', width: 'auto', verticalAlign: '-0.306em' }}
      />
      <span
        style={{
          fontFamily: "'Montserrat', 'Inter', system-ui, sans-serif",
          fontWeight: 800,
          letterSpacing: '-0.01em',
          marginLeft: '0.14em',
          color: '#000',
        }}
      >
        FAB
      </span>
    </span>
  );
}
