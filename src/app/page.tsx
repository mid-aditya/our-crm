import Link from "next/link";
import {
  HiOutlineChartBar,
  HiOutlineChatAlt2,
  HiOutlineCheckCircle,
  HiOutlineClipboardList,
  HiOutlineLightningBolt,
  HiOutlineShieldCheck,
  HiOutlineUserGroup,
} from "react-icons/hi";

const features = [
  {
    title: "Contact Management",
    desc: "Kelola prospek, pelanggan, label, catatan, dan histori aktivitas dalam satu tempat.",
    icon: HiOutlineUserGroup,
  },
  {
    title: "Sales Pipeline",
    desc: "Pantau deal dari chat masuk sampai closing dengan pipeline visual yang mudah dipakai.",
    icon: HiOutlineLightningBolt,
  },
  {
    title: "Task & Follow-up",
    desc: "Buat tugas, atur prioritas, dan pastikan setiap prospek ditindaklanjuti tepat waktu.",
    icon: HiOutlineClipboardList,
  },
  {
    title: "WhatsApp Ready",
    desc: "Disiapkan untuk integrasi WhatsApp broadcast dan inbox omnichannel via provider API.",
    icon: HiOutlineChatAlt2,
  },
  {
    title: "Analytics",
    desc: "Lihat revenue, conversion rate, dan aktivitas tim dari data real CRM Anda.",
    icon: HiOutlineChartBar,
  },
  {
    title: "Secure Multi-user",
    desc: "Auth, role, team isolation, dan RLS Supabase untuk menjaga data bisnis tetap aman.",
    icon: HiOutlineShieldCheck,
  },
];

const steps = [
  { label: "Sign up", note: "Buat akun & workspace" },
  { label: "Tambah kontak", note: "Manual atau import CSV" },
  { label: "Buat deal", note: "Catat nilai & stage" },
  { label: "Follow up", note: "Tugas & reminder aktif" },
  { label: "Close sale", note: "Deal masuk laporan" },
];

function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary font-display text-[13px] font-bold text-primary-foreground">
        O
      </span>
      <span className="font-display text-[15px] font-bold tracking-tight text-foreground">
        Our CRM
      </span>
    </span>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/" aria-label="Our CRM — beranda">
            <Wordmark />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {[
              ["Fitur", "#fitur"],
              ["Alur kerja", "#alur-kerja"],
              ["Keamanan", "#keamanan"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="microlabel text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Login
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Mulai
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 md:px-6 md:pb-24 md:pt-20">
        <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div>
            <p className="microlabel flex items-center gap-2 text-primary">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              CRM Omnichannel — untuk bisnis Indonesia
            </p>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              Chat masuk jadi deal.
              <br />
              <span className="text-primary">Semua tercatat rapi.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
              Our CRM menyatukan kontak, pipeline, follow-up, dan laporan dalam
              satu workspace yang ringan — siap untuk WhatsApp dan channel
              lainnya.
            </p>
            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Mulai Sekarang
              </Link>
              <a
                href="#fitur"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-card px-5 text-sm font-semibold transition-colors hover:bg-secondary"
              >
                Lihat Fitur
              </a>
            </div>

            {/* Stat strip — satu garis, bukan kartu */}
            <dl className="mt-10 grid grid-cols-3 divide-x divide-border border-y border-border">
              {[
                ["<2s", "Page load"],
                ["100+", "Broadcast / min"],
                ["RLS", "Data terisolasi"],
              ].map(([value, label]) => (
                <div key={label} className="px-4 py-3 first:pl-0">
                  <dt className="microlabel text-muted-foreground">{label}</dt>
                  <dd className="num mt-1.5 text-xl font-semibold text-foreground">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Snapshot — gaya buku kas: header kolom + baris + total */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="font-display text-sm font-bold tracking-tight">
                  Pipeline Snapshot
                </p>
                <p className="microlabel mt-1 text-muted-foreground">
                  Realtime overview
                </p>
              </div>
              <span className="microlabel flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-1 text-success">
                <span className="h-1 w-1 rounded-full bg-success" />
                Live
              </span>
            </div>
            <div className="microlabel grid grid-cols-[1fr_auto_auto] gap-4 border-b border-border/70 px-4 py-2 text-muted-foreground">
              <span>Kontak</span>
              <span className="text-right">Nilai</span>
              <span className="w-12 text-right">Status</span>
            </div>
            <div className="divide-y divide-border/70">
              {[
                ["Premium Plan", "Ahmad Zaki", "Rp 5.000.000", "Hot"],
                ["Demo Follow-up", "Budi Santoso", "Rp 2.000.000", "Warm"],
                ["Support Ticket", "Siti Aminah", "Rp 750.000", "New"],
              ].map(([title, name, value, tag]) => (
                <div
                  key={title}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-2.5 transition-colors hover:bg-secondary/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold">
                      {title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {name}
                    </p>
                  </div>
                  <p className="num text-[13px] font-medium">{value}</p>
                  <div className="w-12 text-right">
                    <span
                      className={
                        "microlabel rounded px-1.5 py-1 " +
                        (tag === "Hot"
                          ? "bg-destructive/10 text-destructive"
                          : tag === "Warm"
                            ? "bg-warning/10 text-warning"
                            : "bg-secondary text-secondary-foreground")
                      }
                    >
                      {tag}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-border bg-secondary/40 px-4 py-2.5">
              <span className="microlabel text-muted-foreground">
                Total open
              </span>
              <span className="num text-sm font-semibold text-primary">
                Rp 7.750.000
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Fitur — grid hairline, tanpa kartu melayang */}
      <section
        id="fitur"
        className="border-y border-border bg-card/40"
      >
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
          <div className="mb-10 max-w-xl">
            <p className="microlabel text-primary">Fitur</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
              Semua yang tim sales & support butuhkan
            </h2>
          </div>
          <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-card p-5 transition-colors hover:bg-secondary/40"
              >
                <feature.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 text-[15px] font-bold tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Alur kerja — sequence asli, layak pakai nomor */}
      <section id="alur-kerja" className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="max-w-xl">
            <p className="microlabel text-primary">Alur kerja</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
              Dari signup sampai close sale
            </h2>
          </div>
          <Link
            href="/login"
            className="w-fit rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Coba Sekarang
          </Link>
        </div>
        <ol className="relative grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-5">
          {steps.map((step, i) => (
            <li key={step.label} className="bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="num text-xs font-semibold text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {i < steps.length - 1 && (
                  <span
                    aria-hidden
                    className="hidden h-px flex-1 bg-border md:block"
                  />
                )}
              </div>
              <p className="mt-3 text-sm font-bold">{step.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {step.note}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Keamanan */}
      <section
        id="keamanan"
        className="border-y border-border bg-card/40"
      >
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:px-6 md:py-20 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="microlabel text-primary">Keamanan</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
              Data aman sejak baris pertama
            </h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
              Our CRM memakai Supabase Auth, team isolation, dan Row Level
              Security agar data antar tim tidak pernah bercampur.
            </p>
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {[
              "Supabase Auth",
              "Role-based access",
              "Team isolation",
              "RLS policies",
              "Activity logs",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium"
              >
                <HiOutlineCheckCircle className="h-4 w-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
        <div className="flex flex-col justify-between gap-6 rounded-xl bg-ink p-8 text-ink-foreground md:flex-row md:items-center md:p-10">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
              Siap kelola customer lebih rapi?
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Masuk ke dashboard dan mulai tambah kontak pertama Anda.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex h-10 w-fit shrink-0 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Login / Register
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-6">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-2 px-4 md:flex-row md:items-center md:px-6">
          <Wordmark />
          <p className="microlabel text-muted-foreground">
            © {new Date().getFullYear()} Our CRM — Omnichannel customer
            management
          </p>
        </div>
      </footer>
    </main>
  );
}
