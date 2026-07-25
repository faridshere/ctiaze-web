export function Footer() {
  return (
    <footer className="border-t border-hairline mt-16">
      <div className="mx-auto max-w-2xl px-4 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="font-mono text-[11px] text-ink-muted">
          Hackxana tərəfindən. Claude ilə seçilir, yoxlanılır və tərcümə olunur.
        </p>
        <a
          href="https://github.com/faridshere/ctiaze-web"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[11px] text-ink-muted hover:text-ink-primary transition-colors"
        >
          mənbə kodu →
        </a>
      </div>
    </footer>
  );
}
