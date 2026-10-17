"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { parsePaste, parseSbom, MAX_COMPONENTS, MAX_SBOM_BYTES } from "@/lib/stack/parse";
import type { Component, ComponentResult, CveFinding, IdentityVia, VersionVerdict } from "@/lib/stack/types";
import type { StackReport } from "@/lib/stack/server";

// The stack check: paste lines or drop an SBOM, post the extracted rows to
// /api/v1/stack, print the answer as a ledger. The SBOM file is read in the
// browser; only name/version/purl/cpe/vendor rows leave the machine.

const EXAMPLE = `apache log4j 2.14.1
apache http_server 2.4.49
fortinet fortios 7.0.1
nginx 1.25.3`;

const VIA: Record<IdentityVia, string> = {
  cpe: "identified by CPE",
  purl: "identified by purl",
  alias: "known product name",
  kev: "name as in CISA KEV",
  name: "name guess",
};

const VERSION: Record<VersionVerdict, string> = {
  "in-range": "version in NVD range",
  "not-affected": "version outside NVD ranges",
  ambiguous: "version not comparable",
  "no-version": "no version given",
  "not-checked": "version not checked",
};

type Report = StackReport & { note: string };
type Input = { source: "paste" } | { source: "sbom"; file: string; format: string; components: Component[] };

const pct = (x: number) => `${(x * 100).toFixed(x >= 0.1 ? 0 : 1)}%`;

export function StackCheck() {
  const [text, setText] = useState("");
  const [input, setInput] = useState<Input>({ source: "paste" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setError(null);
    if (!f) return;
    if (f.size > MAX_SBOM_BYTES) {
      setError(`${f.name} is over the 2 MB limit (${(f.size / 1048576).toFixed(2)} MB). Split it, or paste the products instead.`);
      e.target.value = "";
      return;
    }
    try {
      const parsed = parseSbom(JSON.parse(await f.text()));
      if (!parsed.components.length) throw new Error("No components with a name in this SBOM.");
      setInput({ source: "sbom", file: f.name, format: parsed.format === "cyclonedx" ? "CycloneDX" : "SPDX", components: parsed.components });
    } catch (err) {
      setError(`${f.name}: ${err instanceof SyntaxError ? "not valid JSON." : (err as Error).message}`);
      e.target.value = "";
    }
  }

  function clearFile() {
    setInput({ source: "paste" });
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const components = input.source === "sbom" ? input.components : parsePaste(text);
    if (!components.length) {
      setError("Paste at least one line, e.g. “apache log4j 2.14.1”, or choose an SBOM file.");
      return;
    }
    if (components.length > MAX_COMPONENTS) {
      setError(`${components.length} components; one check takes at most ${MAX_COMPONENTS}. Split the list.`);
      return;
    }
    setBusy(true);
    setReport(null);
    try {
      const r = await fetch("/api/v1/stack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ components }),
      });
      const body = await r.json().catch(() => null);
      if (!r.ok) throw new Error(body?.error ?? `The check failed (HTTP ${r.status}).`);
      setReport(body as Report);
    } catch (err) {
      setError((err as Error).message || "The check failed.");
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `skopnix-stack-check-${report.generated_at.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <form onSubmit={submit} className="grid gap-8 md:grid-cols-12 md:gap-6">
        <div className="md:col-span-7">
          <label htmlFor="stack-input" className="label text-ink">
            Paste your stack · one “vendor product version” per line
          </label>
          <textarea
            id="stack-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={input.source === "sbom"}
            rows={8}
            spellCheck={false}
            placeholder={EXAMPLE}
            className="ruled-input mt-3 block min-h-[12rem] resize-y border border-rule-soft border-b-2 border-b-ink bg-paper-deep px-3 leading-relaxed disabled:opacity-50"
          />
          <p className="mt-2 font-mono text-[11.5px] text-ink-3">
            Also accepted per line: a purl (pkg:maven/…) or a CPE 2.3 name. Up to {MAX_COMPONENTS} components.
          </p>
        </div>
        <div className="md:col-span-5 md:border-l md:border-rule-soft md:pl-6">
          <span className="label text-ink">Or an SBOM file</span>
          <p className="mt-3 text-[14.5px] leading-snug text-ink-2">
            CycloneDX or SPDX, JSON, up to 2 MB. Read in your browser; only each component’s name, version, purl and CPE are sent.
          </p>
          <input
            ref={fileRef}
            id="sbom"
            type="file"
            accept=".json,application/json"
            onChange={onFile}
            className="mt-4 block w-full font-mono text-[12.5px] text-ink-2 file:label file:mr-3 file:cursor-pointer file:border file:border-ink file:bg-transparent file:px-3 file:py-2 file:text-ink hover:file:bg-ink hover:file:text-paper"
          />
          {input.source === "sbom" && (
            <p className="mt-3 font-mono text-[12px] text-ink">
              {input.components.length} components from {input.format} · {input.file}{" "}
              <button type="button" onClick={clearFile} className="label ml-2 text-ink-3 underline-offset-4 hover:text-ink hover:underline">
                Use the paste box instead
              </button>
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="label mt-6 inline-flex h-12 items-center justify-center gap-2 bg-ink px-5 text-paper transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Checking…" : "Check stack"} <span aria-hidden>→</span>
          </button>
          {busy && <p className="mt-3 font-mono text-[11.5px] text-ink-3">Pulling NVD records for products not seen recently can take up to a minute.</p>}
        </div>
      </form>

      <div aria-live="polite">
        {error && (
          <p role="alert" className="mt-6 border-l-2 border-worse pl-3 text-[14.5px] text-worse">
            {error}
          </p>
        )}
        {report && <Results report={report} onDownload={download} />}
      </div>
    </div>
  );
}

function Results({ report, onDownload }: { report: Report; onDownload: () => void }) {
  const s = report.sources;
  const ordered = [...report.components].sort((a, b) => score(b) - score(a));
  return (
    <section className="pt-10" aria-labelledby="stack-results">
      <div className="flex items-center gap-4">
        <h2 id="stack-results" className="label whitespace-nowrap text-ink">
          The result · exploited first
        </h2>
        <span aria-hidden className="h-[2px] flex-1 bg-ink" />
        <button type="button" onClick={onDownload} className="label whitespace-nowrap text-ink-3 underline-offset-4 hover:text-ink hover:underline">
          JSON ↓
        </button>
      </div>
      <dl className="cells mt-4 grid grid-cols-2 sm:grid-cols-4">
        {[
          ["Components", report.summary.components],
          ["With findings", report.summary.with_findings],
          ["KEV CVEs", report.summary.kev_cves],
          ["Cited actors on", report.summary.cves_with_cited_actors],
        ].map(([k, v]) => (
          <div key={k as string} className="bg-paper px-4 py-3">
            <dt className="label text-ink-3">{k}</dt>
            <dd className="num mt-1 font-mono text-[22px] text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 font-mono text-[11.5px] leading-relaxed text-ink-3">
        CISA KEV {s.kev_catalog.status === "ok" ? `catalog of ${s.kev_catalog.released ?? "today"}` : <span className="text-worse">catalog unavailable: KEV flags may be missing</span>}
        {" · "}NVD: {s.nvd.pulled} product{s.nvd.pulled === 1 ? "" : "s"} read
        {s.nvd.skipped > 0 && <span className="text-worse">, {s.nvd.skipped} over this check’s lookup budget</span>}
        {s.nvd.errors > 0 && <span className="text-worse">, {s.nvd.errors} failed</span>}
        {s.nvd.truncated.length > 0 && <span>, cut at 4,000 CVEs: {s.nvd.truncated.join(", ")}</span>}
        {" · "}EPSS: FIRST.org
        {s.actors !== "ok" && (
          <span className="text-worse"> · actor citations unavailable right now: this is an outage, not “no actors”</span>
        )}
      </p>
      <p className="mt-2 max-w-[80ch] text-[13.5px] leading-snug text-ink-3">{report.note}</p>
      <ol className="mt-6">
        {ordered.map((c, i) => (
          <ComponentBlock key={i} c={c} />
        ))}
      </ol>
    </section>
  );
}

const score = (c: ComponentResult) =>
  (c.findings.some((f) => f.kev) ? 4 : 0) + (c.findings.some((f) => f.actors.length) ? 2 : 0) + (c.findings.length ? 1 : 0);

function ComponentBlock({ c }: { c: ComponentResult }) {
  const kev = c.findings.filter((f) => f.kev).length;
  const label = `${c.input.vendor ? c.input.vendor + " " : ""}${c.input.name}`;
  return (
    <li className="rule-b pb-6 pt-6 first:pt-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="headline text-[22px] text-ink">{label}</h3>
        <span className="num font-mono text-[14px] text-ink-2">{c.input.version ?? "no version"}</span>
        {kev > 0 && <span className="stamp">{kev} KEV</span>}
      </div>
      <p className="mt-1 font-mono text-[11.5px] text-ink-3">
        {c.resolved ? (
          <>
            NVD {c.resolved.vendor}:{c.resolved.product} · {VIA[c.resolved.via]}
          </>
        ) : (
          "not identified"
        )}
        {" · "}
        {c.total_affected} CVE{c.total_affected === 1 ? "" : "s"} listed
        {c.not_affected > 0 && ` · ${c.not_affected} ruled out by version`}
        {c.total_affected > c.findings.length && ` · the ${c.findings.length} most urgent shown`}
      </p>
      {c.note && (
        <p className={`mt-2 text-[14px] leading-snug ${c.status === "upstream-error" ? "text-worse" : c.status === "partial" ? "text-caution" : "text-ink-2"}`}>{c.note}</p>
      )}
      {c.findings.length > 0 && (
        <ol className="mt-3">
          {c.findings.map((f) => (
            <Finding key={f.cve} f={f} />
          ))}
        </ol>
      )}
    </li>
  );
}

function Finding({ f }: { f: CveFinding }) {
  return (
    <li className="row py-3" data-sev={f.kev ? "kev" : f.actors.length ? "high" : undefined}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Link href={`/cve/${f.cve}`} className="num ulink font-mono text-[14px] text-ink">
          {f.cve}
        </Link>
        {f.kev && <span className="stamp">KEV{f.kev_date_added ? ` · ${f.kev_date_added}` : ""}</span>}
        {f.ransomware && <span className="stamp stamp-ink">ransomware use</span>}
        {f.epss !== null && (
          <span className={`num font-mono text-[12px] ${f.epss >= 0.1 ? "text-caution" : "text-ink-3"}`}>EPSS {pct(f.epss)}</span>
        )}
        <span className="tag text-ink-2" title="How sure we are that this CVE applies to what you run">
          {f.confidence} confidence
        </span>
      </div>
      <p className="mt-1 font-mono text-[11.5px] text-ink-3">
        {VERSION[f.version]}
        {f.version_detail && ` · ${f.version_detail}`}
        {f.fixed_in && ` · fixed in ${f.fixed_in}`}
        {f.coverage_priority && ` · our coverage: ${f.coverage_priority}`}
      </p>
      {f.actors.length > 0 && (
        <div className="mt-2">
          <span className="label text-ink">Exploited by, as the source states</span>
          <ul className="mt-1 space-y-2">
            {f.actors.map((a, i) => (
              <li key={i} className="border-l-2 border-ink pl-3">
                <Link href={`/actors/${a.actor_id}`} className="label ulink text-ink">
                  {a.actor}
                </Link>
                <blockquote className="mt-1 max-w-[70ch] text-[14.5px] leading-snug text-ink-2">“{a.evidence}”</blockquote>
                <p className="mt-1 font-mono text-[11px] text-ink-3">
                  {a.url ? (
                    <a href={a.url} target="_blank" rel="nofollow noopener noreferrer" className="ulink hover:text-ink">
                      {a.source} ↗
                    </a>
                  ) : (
                    a.source
                  )}
                  {a.date && ` · ${a.date}`}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
