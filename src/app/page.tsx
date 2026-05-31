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
  "Sign up",
  "Tambah kontak",
  "Buat deal",
  "Follow up",
  "Close sale",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <Link
            href="/"
            className="text-2xl font-black bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent"
          >
            Our CRM
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-bold text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#workflow" className="hover:text-foreground">
              Workflow
            </a>
            <a href="#security" className="hover:text-foreground">
              Security
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Login
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_30%)]" />
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
              <HiOutlineChatAlt2 className="h-4 w-4" />
              CRM Omnichannel untuk bisnis Indonesia
            </div>
            <div className="space-y-5">
              <h1 className="text-5xl font-black tracking-tight md:text-7xl">
                Kelola sales, support, dan WhatsApp dalam satu CRM.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
                Our CRM membantu tim Anda mengubah chat masuk menjadi deal,
                mengatur follow-up, dan memantau performa bisnis dari data real.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-base font-black text-primary-foreground shadow-xl shadow-primary/20 hover:bg-primary/90"
              >
                Mulai Sekarang
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-card px-6 text-base font-black hover:bg-secondary"
              >
                Lihat Fitur
              </a>
            </div>
            <div className="grid max-w-xl grid-cols-3 gap-4 pt-4">
              {[
                ["<2s", "Page load"],
                ["100+", "Broadcast/min"],
                ["RLS", "Secure data"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-border bg-card/70 p-4 backdrop-blur"
                >
                  <p className="text-2xl font-black text-primary">{value}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-primary/10 blur-3xl" />
            <div className="rounded-[2rem] border border-border bg-card p-4 shadow-2xl">
              <div className="rounded-3xl bg-secondary/40 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black">Pipeline Snapshot</p>
                    <p className="text-xs text-muted-foreground">
                      Realtime CRM overview
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-600">
                    Live
                  </span>
                </div>
                <div className="grid gap-3">
                  {[
                    ["Ahmad Zaki", "Premium Plan", "Rp 5.000.000", "Hot"],
                    ["Budi Santoso", "Demo Follow-up", "Rp 2.000.000", "Warm"],
                    ["Siti Aminah", "Support Ticket", "Rp 750.000", "New"],
                  ].map(([name, title, value, tag]) => (
                    <div
                      key={name}
                      className="rounded-2xl border border-border bg-card p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black">{title}</p>
                          <p className="text-sm text-muted-foreground">
                            {name}
                          </p>
                        </div>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                          {tag}
                        </span>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                        <p className="text-sm font-black text-primary">
                          {value}
                        </p>
                        <p className="text-xs font-bold text-muted-foreground">
                          Follow-up today
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-3xl font-black tracking-tight md:text-5xl">
            Fitur utama untuk tim sales & support
          </h2>
          <p className="mt-4 text-muted-foreground">
            Ringan, cepat, dan siap dikembangkan untuk WhatsApp marketing.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-3xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-5 inline-flex rounded-2xl bg-primary/10 p-3 text-primary transition-transform group-hover:scale-110">
                <feature.icon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-black">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="rounded-[2rem] border border-border bg-card p-8 md:p-12">
          <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-3xl font-black md:text-5xl">
                Workflow sederhana
              </h2>
              <p className="mt-3 text-muted-foreground">
                Dari signup sampai close sale dalam hitungan menit.
              </p>
            </div>
            <Link
              href="/login"
              className="w-fit rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20"
            >
              Coba Workflow
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            {steps.map((step, i) => (
              <div key={step} className="rounded-2xl bg-secondary/50 p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">
                  {i + 1}
                </div>
                <p className="font-black">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-3xl font-black md:text-5xl">
              Data aman sejak awal
            </h2>
            <p className="text-muted-foreground">
              Our CRM memakai Supabase Auth, team isolation, dan Row Level
              Security agar data antar tim tidak bocor.
            </p>
          </div>
          <div className="space-y-3">
            {[
              "Supabase Auth",
              "Role-based access",
              "Team isolation",
              "RLS policies",
              "Activity logs",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <HiOutlineCheckCircle className="h-6 w-6 text-emerald-500" />
                <span className="font-bold">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="rounded-[2rem] bg-gradient-to-r from-primary to-orange-400 p-8 text-primary-foreground shadow-2xl md:p-12">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-black md:text-5xl">
                Siap kelola customer lebih rapi?
              </h2>
              <p className="mt-3 opacity-90">
                Masuk ke dashboard dan mulai tambah kontak pertama Anda.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex h-12 w-fit items-center justify-center rounded-xl bg-white px-6 text-base font-black text-orange-600 hover:bg-white/90"
            >
              Login / Register
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-4 text-sm text-muted-foreground md:flex-row md:px-8">
          <p>
            © {new Date().getFullYear()} Our CRM. Built for Indonesian
            businesses.
          </p>
          <p>Omnichannel customer management platform.</p>
        </div>
      </footer>
    </main>
  );
}
