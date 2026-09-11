// The app's mark: a rounded ink-coloured square with a serif "L" monogram
// in the theme's off-white — the same serif display face the headings use
// (see --font-display in app/globals.css), so it reads as part of the
// editorial look rather than an icon dropped in from elsewhere. Sized by
// the caller; the letter scales with the box via em units.
export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white ${className}`}
      style={{ fontFamily: "var(--font-display)" }}
    >
      <span className="text-[1.05em] font-semibold leading-none tracking-tight">L</span>
    </div>
  );
}
