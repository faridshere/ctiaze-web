// "No. 1,139": the edition number is the archive total. Printed in the tape,
// the nameplate and the colophon, always from the same number. Each digit is
// its own span so WireLive can roll one when a dispatch lands.
export function EditionNo({ total, className = "" }: { total: number; className?: string }) {
  const text = total.toLocaleString("en-US");
  return (
    <span className={`num whitespace-nowrap font-mono ${className}`} data-edition-no={total}>
      No.{" "}
      <span data-digits>
        {text.split("").map((ch, i) => (
          <span key={i} data-ch={/\d/.test(ch) ? "d" : "s"} className="inline-block">
            {ch}
          </span>
        ))}
      </span>
    </span>
  );
}
