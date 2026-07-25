export function Footer() {
  return (
    <footer className="mt-16">
      <div className="border-t border-hairline" />
      <div className="border-t-[3px] border-ink-primary mt-[2px]" />
      <div className="mx-auto max-w-5xl px-4 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="font-mono text-[11px] text-ink-muted">
          © {new Date().getFullYear()} ctiaze · Hackxana tərəfindən hazırlanıb və idarə olunur
        </p>
        <p className="font-mono text-[11px] text-ink-muted">
          40+ mənbədən · 24/7 avtomatik yayım
        </p>
      </div>
    </footer>
  );
}
