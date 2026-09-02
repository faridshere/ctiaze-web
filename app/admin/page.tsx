import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { isAdmin, adminConfigured } from "@/lib/admin-auth";
import { AdminLogin, AdminTools } from "@/components/AdminClient";

// Private dashboard: who signed up, and who is visiting. Always dynamic (it
// reads the session cookie) and never cached.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: { absolute: "Admin" },
  robots: { index: false, follow: false, nocache: true },
};

type Signup = { email: string; source?: string; created_at?: Date; ip?: string; country?: string | null; city?: string | null };
type Visit = { at?: Date; ip?: string; country?: string | null; city?: string | null; path?: string; ref?: string | null; host?: string | null };

function ago(d?: Date | string | null): string {
  if (!d) return "—";
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return "—";
  const m = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
}

const WEEK = () => new Date(Date.now() - 7 * 86400_000);

async function load() {
  const db = await getDb();
  const signupsCol = db.collection<Signup>("signups");
  const visitsCol = db.collection<Visit>("visits");

  const [signups, signupTotal, signupWeek, visits, visitTotal, visitWeek, byCountry, byPath, uniqueIps] =
    await Promise.all([
      signupsCol.find({}).sort({ created_at: -1 }).limit(500).toArray().catch(() => []),
      signupsCol.countDocuments().catch(() => 0),
      signupsCol.countDocuments({ created_at: { $gte: WEEK() } }).catch(() => 0),
      visitsCol.find({}).sort({ at: -1 }).limit(100).toArray().catch(() => []),
      visitsCol.countDocuments().catch(() => 0),
      visitsCol.countDocuments({ at: { $gte: WEEK() } }).catch(() => 0),
      visitsCol
        .aggregate([{ $group: { _id: "$country", n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 8 }])
        .toArray()
        .catch(() => []),
      visitsCol
        .aggregate([{ $group: { _id: "$path", n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 8 }])
        .toArray()
        .catch(() => []),
      visitsCol.distinct("ip").then((a) => a.length).catch(() => 0),
    ]);

  return { signups, signupTotal, signupWeek, visits, visitTotal, visitWeek, byCountry, byPath, uniqueIps };
}

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-md border border-hairline bg-surface-raised/40 px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">{label}</div>
      <div className="mt-1 font-headline text-2xl tabular-nums text-ink-primary">{value}</div>
      {note && <div className="font-mono text-[10.5px] text-ink-muted">{note}</div>}
    </div>
  );
}

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10">
        <AdminLogin />
        {!adminConfigured() && (
          <p className="mx-auto mt-6 max-w-sm rounded-md border border-accent-warning/40 bg-accent-warning/[0.06] px-4 py-3 text-[13px] leading-relaxed text-ink-secondary">
            No <code className="font-mono">ADMIN_TOKEN</code> is set in the environment, so nothing can sign in yet.
            Add one in Vercel → Settings → Environment Variables (any long random string), then redeploy.
          </p>
        )}
      </main>
    );
  }

  let data: Awaited<ReturnType<typeof load>> | null = null;
  let err: string | null = null;
  try {
    data = await load();
  } catch (e) {
    err = (e as Error).message.slice(0, 200);
  }

  if (!data) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10">
        <h1 className="font-display text-2xl font-semibold text-ink-primary">Admin</h1>
        <p className="mt-4 rounded-md border border-accent-critical/40 bg-accent-critical/[0.06] px-4 py-3 text-[13px] text-ink-secondary">
          Couldn&apos;t read the database: {err}
        </p>
      </main>
    );
  }

  const emails = data.signups.map((s) => s.email).filter(Boolean);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-ink-primary">Admin</h1>
        <span className="font-mono text-[11px] text-ink-muted">live · visits expire after 30 days</span>
      </div>

      <div className="mt-5">
        <AdminTools emails={emails} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="signups" value={data.signupTotal.toLocaleString("en-US")} note={`${data.signupWeek} this week`} />
        <Stat label="visits" value={data.visitTotal.toLocaleString("en-US")} note={`${data.visitWeek} this week`} />
        <Stat label="unique IPs" value={data.uniqueIps.toLocaleString("en-US")} />
        <Stat label="countries" value={data.byCountry.filter((c) => c._id).length} />
      </div>

      {/* ---- signups ---- */}
      <h2 className="mt-10 font-mono text-[11px] uppercase tracking-[0.16em] text-brand">
        Emails collected — {data.signupTotal}
      </h2>
      {data.signups.length === 0 ? (
        <p className="mt-3 rounded-md border border-hairline bg-surface-raised/30 px-4 py-3 text-[13px] text-ink-secondary">
          Nothing yet. If people <em>are</em> submitting the form, check that{" "}
          <code className="font-mono">MONGO_URI_WRITE</code>{" "}is set in Vercel — without it the form politely says
          &ldquo;not open yet&rdquo; and stores nothing.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left">
            <thead>
              <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                <th className="py-2 pr-3 font-normal">email</th>
                <th className="py-2 pr-3 font-normal">where from</th>
                <th className="py-2 pr-3 font-normal">location</th>
                <th className="py-2 pr-3 font-normal">ip</th>
                <th className="py-2 font-normal">when</th>
              </tr>
            </thead>
            <tbody>
              {data.signups.map((s) => (
                <tr key={s.email} className="border-b border-hairline/60 align-top">
                  <td className="py-2 pr-3 text-[13px] text-ink-primary [overflow-wrap:anywhere]">{s.email}</td>
                  <td className="py-2 pr-3 font-mono text-[11.5px] text-ink-secondary">{s.source || "—"}</td>
                  <td className="py-2 pr-3 font-mono text-[11.5px] text-ink-secondary">
                    {[s.city, s.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="py-2 pr-3 font-mono text-[11.5px] text-ink-muted">{s.ip || "—"}</td>
                  <td className="py-2 font-mono text-[11.5px] text-ink-muted">{ago(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- traffic ---- */}
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand">Top countries</h2>
          <ul className="mt-3 space-y-1 font-mono text-[12px]">
            {data.byCountry.length === 0 && <li className="text-ink-muted">no visits recorded yet</li>}
            {data.byCountry.map((c) => (
              <li key={String(c._id)} className="flex justify-between border-b border-hairline/60 py-1">
                <span className="text-ink-secondary">{String(c._id ?? "unknown")}</span>
                <span className="tabular-nums text-ink-primary">{c.n}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-brand">Top pages</h2>
          <ul className="mt-3 space-y-1 font-mono text-[12px]">
            {data.byPath.length === 0 && <li className="text-ink-muted">no visits recorded yet</li>}
            {data.byPath.map((p) => (
              <li key={String(p._id)} className="flex justify-between gap-3 border-b border-hairline/60 py-1">
                <span className="truncate text-ink-secondary">{String(p._id ?? "/")}</span>
                <span className="shrink-0 tabular-nums text-ink-primary">{p.n}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ---- recent visitors ---- */}
      <h2 className="mt-10 font-mono text-[11px] uppercase tracking-[0.16em] text-brand">Recent visitors</h2>
      {data.visits.length === 0 ? (
        <p className="mt-3 rounded-md border border-hairline bg-surface-raised/30 px-4 py-3 text-[13px] text-ink-secondary">
          No visits logged yet. This also needs <code className="font-mono">MONGO_URI_WRITE</code>.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left">
            <thead>
              <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                <th className="py-2 pr-3 font-normal">ip</th>
                <th className="py-2 pr-3 font-normal">location</th>
                <th className="py-2 pr-3 font-normal">page</th>
                <th className="py-2 pr-3 font-normal">from</th>
                <th className="py-2 font-normal">when</th>
              </tr>
            </thead>
            <tbody>
              {data.visits.map((v, i) => (
                <tr key={i} className="border-b border-hairline/60">
                  <td className="py-2 pr-3 font-mono text-[11.5px] text-ink-primary">{v.ip || "—"}</td>
                  <td className="py-2 pr-3 font-mono text-[11.5px] text-ink-secondary">
                    {[v.city, v.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="py-2 pr-3 font-mono text-[11.5px] text-ink-secondary [overflow-wrap:anywhere]">
                    {v.host && v.host.includes("ctiaze") ? "ctiaze:" : ""}{v.path || "/"}
                  </td>
                  <td className="py-2 pr-3 font-mono text-[11.5px] text-ink-muted">{v.ref || "direct"}</td>
                  <td className="py-2 font-mono text-[11.5px] text-ink-muted">{ago(v.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
