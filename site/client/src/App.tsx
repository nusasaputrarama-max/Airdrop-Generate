import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaTopScrim } from "@hatch/space-sdk/client";
import { api, type ApiResponse } from "./api";
import heroNetwork from "./assets/hero-network.webp";
import gibranMascot from "./assets/gibran-mascot.jpg";
import logoStacked from "./assets/logo-stacked.png";
import logoIcon from "./assets/logo-icon.png";
import faviconPng from "./assets/favicon.png";

type Check = ApiResponse<typeof api, "listChecks">["checks"][number];
type Signal = Check["signals"][number];
type Verdict = Check["verdict"];
type Project = ApiResponse<typeof api, "listProjects">["projects"][number];
type TaskStatus = Project["task_status"];
type Segment = Project["segment"];
type Category = Project["category"];

const CATEGORIES: Category[] = ["DeFi", "Layer 1", "Layer 2", "NFT", "Gaming", "Testnet", "AI & Web3"];
const CHAINS = ["BNB Chain", "Robinhood Chain"] as const;

const VERDICT: Record<
  Verdict,
  { label: string; color: string; bg: string; advice: string }
> = {
  bahaya: {
    label: "BAHAYA",
    color: "var(--red)",
    bg: "var(--red-bg)",
    advice:
      "Jangan buka link ini dan jangan connect wallet apa pun ke sana. Kalau kamu sudah terlanjur connect, putuskan koneksinya dari pengaturan wallet dan jangan tanda tangani apa pun lagi dari situs itu.",
  },
  waspada: {
    label: "WASPADA",
    color: "var(--amber)",
    bg: "var(--amber-bg)",
    advice:
      "Ada tanda-tanda mencurigakan. Jangan connect wallet utama. Kalau tetap penasaran, pakai wallet kosong khusus (burner) dan jangan pernah menyetujui tanda tangan yang isinya tidak kamu pahami.",
  },
  lebih_aman: {
    label: "LEBIH AMAN",
    color: "var(--green)",
    bg: "var(--green-bg)",
    advice:
      "Tidak ada tanda bahaya yang terdeteksi dari sinyal-sinyal di bawah. Tetap baca baik-baik setiap permintaan tanda tangan di wallet — pemeriksa ini membaca kode halaman, bukan menjamin isi transaksinya.",
  },
  tidak_diketahui: {
    label: "TIDAK BISA DINILAI",
    color: "var(--dim)",
    bg: "var(--surface2)",
    advice:
      "Situsnya tidak bisa dijangkau dan data domainnya tidak ditemukan, jadi belum ada dasar untuk bilang aman. Perlakukan sebagai mencurigakan sampai bisa diverifikasi dari sumber resmi proyek.",
  },
};

const SEGMENT_META: Record<Segment, { label: string; color: string; bg: string }> = {
  live: { label: "Sedang Berlangsung", color: "var(--green)", bg: "var(--green-bg)" },
  upcoming: { label: "Segera Hadir", color: "var(--amber)", bg: "var(--amber-bg)" },
  ended: { label: "Sudah Berakhir", color: "var(--dim)", bg: "var(--surface2)" },
};

const TASK_META: Record<TaskStatus, { label: string; color: string }> = {
  not_started: { label: "Belum Dimulai", color: "var(--dim)" },
  in_progress: { label: "Sedang Dikerjakan", color: "var(--amber)" },
  completed: { label: "Selesai", color: "var(--green)" },
};

/** Display-only translation of the stored difficulty values (catalog data stays untouched). */
const DIFFICULTY_LABEL: Record<Project["difficulty"], string> = {
  Easy: "Mudah",
  Medium: "Sedang",
  Hard: "Sulit",
};

const GRADIENT = "linear-gradient(135deg,#f0b90b 0%,#f5c542 55%,#b8860b 100%)";

// Instance formatter dibuat sekali di module scope (C6) — sebelumnya
// `new Intl.DateTimeFormat` dibuat di setiap panggilan.
const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});
const dateOnlyFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});
function fmtDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

function fmtDateOnly(iso: string): string {
  return dateOnlyFormatter.format(new Date(`${iso}T00:00:00+07:00`));
}

function go(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <img
      src={logoIcon}
      alt=""
      aria-hidden="true"
      className="shrink-0 object-contain"
      style={{ width: size, height: size, filter: "drop-shadow(0 0 10px rgba(240,185,11,0.45))" }}
    />
  );
}

/**
 * Navbar lockup built from the official assets: the gold symbol icon
 * beside the wordmark rendered in site typography — "AIRDROP" in white,
 * "GENERATE" in brand gold #F0B90B with wide letter spacing and the gold
 * rule from the original lockup — so it sits directly on the dark navbar
 * with no plate behind it. (The official horizontal PNG's "AIRDROP"
 * wordmark is dark #0B0E11 and would vanish on the dark background.)
 */
function Brand() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={38} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[17px] font-black tracking-[0.08em] text-[var(--text)]">
          AIRDROP
        </span>
        <span
          className="font-display mt-1 text-[10px] font-bold tracking-[0.42em]"
          style={{ color: "var(--accent)" }}
        >
          GENERATE
        </span>
        <span
          aria-hidden="true"
          className="mt-1.5 h-[2px] w-full rounded-full"
          style={{ backgroundColor: "var(--accent)" }}
        />
      </span>
    </span>
  );
}

/**
 * Stacked lockup in the footer and About. Its "AIRDROP" wordmark is dark
 * (#0B0E11), so the official artwork — untouched — is presented on a light
 * brand plate framed in gold with a soft gold glow, keeping every part of
 * it readable against the dark UI.
 */
function StackedLogo({ width = 190 }: { width?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-[var(--radius)] px-5 py-4"
      style={{
        background: "linear-gradient(160deg, #ffffff 0%, #f5f5f5 60%, #edf0f8 100%)",
        border: "1px solid rgba(240,185,11,0.6)",
        boxShadow:
          "0 12px 32px rgba(0,0,0,0.5), 0 0 26px rgba(240,185,11,0.16), inset 0 1px 0 rgba(255,255,255,0.9)",
      }}
    >
      <img
        src={logoStacked}
        alt="AIRDROP GENERATE"
        className="h-auto object-contain"
        style={{ width }}
        width={1400}
        height={1520}
      />
    </span>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.8-3.8" />
    </svg>
  );
}

function BookmarkButton({
  active,
  onToggle,
  label,
}: {
  active: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={label}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors"
      style={{
        borderColor: active ? "var(--accent)" : "var(--border)",
        color: active ? "var(--accent)" : "var(--dim)",
        backgroundColor: active ? "rgba(240,185,11,0.12)" : "transparent",
      }}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M6 3h12v18l-6-4.5L6 21z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function Chip({ children, color, bg }: { children: ReactNode; color: string; bg: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color, backgroundColor: bg }}
    >
      {children}
    </span>
  );
}

function Navbar({ onConnect }: { onConnect: () => void }) {
  const [open, setOpen] = useState(false);
  const links: { label: string; target: string }[] = [
    { label: "Beranda", target: "home" },
    { label: "Jelajahi Airdrop", target: "explore" },
    { label: "Segera Hadir", target: "upcoming" },
    { label: "Cek Link", target: "checker" },
    { label: "Panduan", target: "guide" },
    { label: "Tentang", target: "about" },
  ];
  const jump = (target: string) => {
    setOpen(false);
    go(target);
  };
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)]" style={{ backgroundColor: "rgba(5,7,15,0.88)", backdropFilter: "blur(10px)" }}>
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => jump("home")} aria-label="AIRDROP GENERATE — kembali ke Beranda" className="text-left">
          <Brand />
        </button>
        <nav aria-label="Navigasi utama" className="ml-6 hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <button
              key={l.target}
              type="button"
              onClick={() => jump(l.target)}
              className="rounded-full px-3 py-2 text-sm font-medium text-[var(--dim)] transition-colors hover:text-[var(--text)]"
            >
              {l.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => jump("dashboard")}
            className="hidden rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold sm:block"
          >
            Dasbor
          </button>
          <button
            type="button"
            onClick={onConnect}
            className="rounded-full px-4 py-2 text-sm font-bold"
            style={{ backgroundImage: GRADIENT, color: "var(--accent-ink)" }}
          >
            Hubungkan Wallet
          </button>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] lg:hidden"
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path d="M5 5l14 14M19 5L5 19" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Navigasi seluler" className="border-t border-[var(--border)] px-4 py-2 lg:hidden">
          {[...links, { label: "Dasbor", target: "dashboard" }].map((l) => (
            <button
              key={l.target}
              type="button"
              onClick={() => jump(l.target)}
              className="block w-full rounded-lg px-3 py-2.5 text-left text-base font-medium"
            >
              {l.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}

function Hero({
  query,
  setQuery,
  stats,
}: {
  query: string;
  setQuery: (v: string) => void;
  stats: { label: string; value: string }[];
}) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    go("explore");
  };
  return (
    <section id="home" className="relative overflow-hidden">
      <img
        src={heroNetwork}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-45"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ backgroundImage: "linear-gradient(180deg, rgba(5,7,15,0.35) 0%, rgba(5,7,15,0.88) 78%, var(--bg) 100%)" }}
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 pt-12 pb-10 sm:pt-16">
        <p className="text-sm font-semibold tracking-wide text-[var(--accent)]">
          PENEMUAN AIRDROP TERVERIFIKASI — SETIAP PROYEK DICEK ON-CHAIN TERLEBIH DAHULU
        </p>
        <h1 className="font-display mt-3 max-w-2xl text-4xl leading-[1.05] font-black tracking-tight sm:text-5xl">
          Temukan Airdrop Crypto Berikutnya
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--dim)] sm:text-lg">
          Jelajahi peluang Web3 yang menjanjikan, temukan airdrop yang akan datang, dan tetap
          selangkah di depan dalam ekosistem terdesentralisasi.
        </p>
        <p
          className="mt-4 inline-flex max-w-xl items-center gap-2 rounded-full bg-[var(--surface)]/85 px-3.5 py-2 text-sm font-semibold"
          style={{ border: "1px solid rgba(240,185,11,0.5)" }}
        >
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
          Dibangun oleh anak bangsa Indonesia
        </p>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--dim)]">
          Airdrop Generate adalah inisiatif tim Indonesia yang membangun platform informasi dan
          keamanan bagi pengguna Web3. Di sini kamu bisa menjelajahi peluang airdrop, mengenali
          potensi risikonya, dan mendapat informasi yang lebih terarah sebelum berinteraksi dengan
          proyek kripto. Platform ini masih dalam tahap pengembangan dan pengujian — kami tidak
          menjamin keamanan setiap proyek atau tautan, tapi terus meningkatkan kualitas informasi
          dan perlindungan yang kami hadirkan.
        </p>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => go("about")}
            className="rounded-full border border-[var(--border)] bg-[var(--surface)]/85 px-4 py-2 text-sm font-semibold transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Tentang Airdrop Generate
          </button>
        </div>
        <form onSubmit={submit} className="mt-6 flex max-w-xl gap-2" role="search">
          <label htmlFor="hero-search" className="sr-only">
            Cari airdrop
          </label>
          <div className="relative flex-1">
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--dim)]">
              <SearchIcon />
            </span>
            <input
              id="hero-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari proyek, chain, kategori…"
              className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)]/90 py-3.5 pr-3 pl-10 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>
          <button
            type="submit"
            className="font-display shrink-0 rounded-full px-5 py-3.5 text-sm font-black tracking-wide"
            style={{ backgroundImage: GRADIENT, color: "var(--accent-ink)" }}
          >
            JELAJAHI SEKARANG
          </button>
        </form>
        <dl className="mt-9 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]/85 px-3 py-3">
              <dd className="font-display text-2xl font-black">{s.value}</dd>
              <dt className="mt-0.5 text-xs leading-snug text-[var(--dim)]">{s.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function monogram(name: string): string {
  return name
    .replace(/[—-]/g, " ")
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function ProjectCard({
  project,
  onDetails,
  onBookmark,
}: {
  project: Project;
  onDetails: (p: Project) => void;
  onBookmark: (p: Project) => void;
}) {
  const seg = SEGMENT_META[project.segment];
  // C5: monogram + hue dihitung sekali per proyek, bukan tiap render.
  const hue = useMemo(() => (project.id * 47) % 360, [project.id]);
  const initials = useMemo(() => monogram(project.name), [project.name]);
  return (
    <article className="flex flex-col rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--accent)]">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="font-display grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-base font-black text-white"
          style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue} 85% 45%), hsl(${(hue + 60) % 360} 85% 55%))` }}
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display truncate text-base font-bold">
            {project.name}
            {project.ticker ? <span className="ml-2 text-sm font-semibold text-[var(--dim)]">{project.ticker}</span> : null}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--dim)]">
            {project.chain} · {project.category} · {DIFFICULTY_LABEL[project.difficulty]}
          </p>
        </div>
        <BookmarkButton
          active={project.bookmarked}
          onToggle={() => onBookmark(project)}
          label={project.bookmarked ? `Hapus tanda untuk ${project.name}` : `Tandai ${project.name}`}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Chip color={seg.color} bg={seg.bg}>
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: seg.color }} />
          {seg.label}
        </Chip>
        <span className="text-xs font-medium text-[var(--dim)]">{project.status_label}</span>
      </div>
      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-[var(--dim)]">{project.description}</p>
      {project.reward_note && (
        <p className="mt-3 rounded-xl bg-[var(--surface2)] px-3 py-2 text-xs leading-relaxed">
          <span className="font-semibold text-[var(--accent)]">Distribusi terverifikasi: </span>
          {project.reward_note}
        </p>
      )}
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onDetails(project)}
          className="flex-1 rounded-full py-2.5 text-sm font-bold"
          style={{ backgroundImage: GRADIENT, color: "var(--accent-ink)" }}
        >
          Lihat Detail
        </button>
        {project.task_status !== "not_started" && (
          <span className="text-xs font-semibold" style={{ color: TASK_META[project.task_status].color }}>
            {TASK_META[project.task_status].label}
          </span>
        )}
      </div>
      <p className="mt-3 text-[11px] text-[var(--dim)]">Diverifikasi {fmtDateOnly(project.verified_at)} · status per tanggal pemeriksaan itu</p>
    </article>
  );
}

function SectionHead({
  id,
  title,
  blurb,
}: {
  id: string;
  title: string;
  blurb?: string;
}) {
  return (
    <div id={id} className="scroll-mt-24">
      <h2 className="font-display text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
      {blurb && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--dim)]">{blurb}</p>}
    </div>
  );
}

const selectClass =
  "rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]";

function ExploreSection({
  projects,
  loading,
  query,
  setQuery,
  chain,
  setChain,
  segment,
  setSegment,
  category,
  setCategory,
  onDetails,
  onBookmark,
}: {
  projects: Project[];
  loading: boolean;
  query: string;
  setQuery: (v: string) => void;
  chain: string;
  setChain: (v: string) => void;
  segment: string;
  setSegment: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  onDetails: (p: Project) => void;
  onBookmark: (p: Project) => void;
}) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (chain !== "All" && p.chain !== chain) return false;
      if (segment !== "All" && p.segment !== segment) return false;
      if (category !== "All" && p.category !== category) return false;
      if (
        q &&
        !`${p.name} ${p.ticker ?? ""} ${p.chain} ${p.category} ${p.description}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [projects, query, chain, segment, category]);

  // C4: pemisahan featured/sisa dilakukan sekali dalam satu useMemo
  // (sebelumnya dua `.filter()` terpisah di luar useMemo, dihitung tiap
  // render — plus satu `.filter()` lagi di dalam JSX).
  const { featured, others } = useMemo(() => {
    const featured: Project[] = [];
    const others: Project[] = [];
    for (const p of filtered) (p.segment === "live" ? featured : others).push(p);
    return { featured, others };
  }, [filtered]);
  const showFeatured = segment === "All" || segment === "live";

  return (
    <section aria-label="Jelajahi airdrop" className="mx-auto w-full max-w-6xl px-4 pt-12">
      <SectionHead
        id="explore"
        title="Jelajahi Airdrop"
        blurb="Setiap proyek di bawah ini sudah diverifikasi on-chain sebelum masuk daftar — kontraknya dibaca, jalur gratisnya dicek, dan dalam kebanyakan kasus mint atau klaim gratisnya sudah benar-benar dieksekusi dengan wallet sungguhan. Setiap kartu mencantumkan tanggal verifikasi itu; status berlaku per tanggal pemeriksaan, jadi verifikasi ulang hal yang sensitif terhadap waktu di halaman resmi proyek."
      />
      <div className="mt-5 flex flex-col gap-3">
        <div className="relative max-w-xl">
          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--dim)]">
            <SearchIcon />
          </span>
          <label htmlFor="explore-search" className="sr-only">
            Cari airdrop
          </label>
          <input
            id="explore-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari airdrop…"
            className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-3 pr-3 pl-10 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="filter-chain">Filter berdasarkan blockchain</label>
          <select id="filter-chain" value={chain} onChange={(e: ChangeEvent<HTMLSelectElement>) => setChain(e.target.value)} className={selectClass}>
            <option value="All">Semua blockchain</option>
            {CHAINS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="filter-status">Filter berdasarkan status</label>
          <select id="filter-status" value={segment} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSegment(e.target.value)} className={selectClass}>
            <option value="All">Semua status</option>
            <option value="live">Sedang Berlangsung</option>
            <option value="upcoming">Segera Hadir</option>
            <option value="ended">Sudah Berakhir</option>
          </select>
          <label className="sr-only" htmlFor="filter-category">Filter berdasarkan kategori</label>
          <select id="filter-category" value={category} onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)} className={selectClass}>
            <option value="All">Semua kategori</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-[var(--dim)]">Memuat proyek terverifikasi…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-6 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-sm leading-relaxed text-[var(--dim)]">
          Belum ada proyek terverifikasi yang cocok dengan filter itu. Proyek hanya ditambahkan
          setelah pemeriksaan on-chain — coba hapus salah satu filter, atau jalankan link-nya lewat
          Cek Link di bawah sebelum memercayainya.
        </p>
      ) : (
        <>
          {showFeatured && featured.length > 0 && (
            <>
              <h3 className="font-display mt-8 text-lg font-bold">Airdrop Unggulan</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((p) => (
                  <ProjectCard key={p.id} project={p} onDetails={onDetails} onBookmark={onBookmark} />
                ))}
              </div>
            </>
          )}
          {others.length > 0 && (
            <>
              <h3 className="font-display mt-8 text-lg font-bold">
                {segment === "ended" ? "Sudah Berakhir" : segment === "upcoming" ? "Segera Hadir" : "Lainnya dari Radar"}
              </h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((p) => (
                  <ProjectCard key={p.id} project={p} onDetails={onDetails} onBookmark={onBookmark} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

function UpcomingSection({
  projects,
  onDetails,
  onBookmark,
}: {
  projects: Project[];
  onDetails: (p: Project) => void;
  onBookmark: (p: Project) => void;
}) {
  const upcoming = projects.filter((p) => p.segment === "upcoming");
  return (
    <section aria-label="Airdrop yang akan datang" className="mx-auto w-full max-w-6xl px-4 pt-14">
      <SectionHead
        id="upcoming"
        title="Airdrop yang Akan Datang"
        blurb="Proyek dalam radar yang belum bisa di-mint atau diklaim secara terbuka. Ditampilkan lengkap dengan hambatan persis yang ditemukan saat verifikasi — tanpa hitung mundur, tanpa tanggal peluncuran tebakan."
      />
      {upcoming.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--dim)]">Saat ini tidak ada proyek dalam antrean verifikasi.</p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((p) => (
            <ProjectCard key={p.id} project={p} onDetails={onDetails} onBookmark={onBookmark} />
          ))}
        </div>
      )}
    </section>
  );
}

const CATEGORY_BLURBS: Record<Category, string> = {
  DeFi: "Launchpad, swap, dan protokol yield",
  "Layer 1": "Blockchain lapisan dasar dan ekosistemnya",
  "Layer 2": "Jaringan penskalaan yang dibangun di atas L1",
  NFT: "Kolektibel, kartu identitas, dan aset digital",
  Gaming: "Dunia permainan dan aset game",
  Testnet: "Jaringan pra-mainnet yang memberi imbalan untuk penguji awal",
  "AI & Web3": "ID Agen, token AI, dan agen otonom",
};

function CategoriesSection({
  projects,
  onPick,
}: {
  projects: Project[];
  onPick: (c: Category) => void;
}) {
  // C3: hitung semua count kategori dalam satu loop (sebelumnya 7x
  // `.filter()` per render — satu per kategori).
  const categoryCounts = useMemo(() => {
    const counts = new Map<Category, number>();
    for (const p of projects) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    return counts;
  }, [projects]);
  return (
    <section aria-label="Kategori airdrop" className="mx-auto w-full max-w-6xl px-4 pt-14">
      <SectionHead id="categories" title="Kategori Airdrop" blurb="Langsung masuk ke kategorinya — jumlahnya hanya menghitung proyek terverifikasi." />
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {CATEGORIES.map((c) => {
          const count = categoryCounts.get(c) ?? 0;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onPick(c)}
              aria-label={`Lihat airdrop ${c}, ${count} proyek terverifikasi`}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors hover:border-[var(--accent)]"
            >
              <span className="font-display block text-base font-bold">{c}</span>
              <span className="mt-1 block text-xs leading-relaxed text-[var(--dim)]">{CATEGORY_BLURBS[c]}</span>
              <span className="mt-2 block text-xs font-semibold text-[var(--accent)]">
                {count} proyek terverifikasi
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: 1, title: "Temukan airdrop", text: "Telusuri katalog terverifikasi atau cari berdasarkan chain, status, dan kategori. Kalau link-nya datang dari X atau Telegram, jalankan dulu lewat Cek Link sebelum dibuka." },
    { n: 2, title: "Lihat detail proyek", text: "Buka kartu detailnya: alamat kontrak, tautan resmi, tingkat kesulitan, dan persis bagaimana proyek itu diverifikasi — beserta tanggalnya." },
    { n: 3, title: "Selesaikan tugas yang memenuhi syarat", text: "Ikuti langkah resmi proyek di situsnya sendiri. Jangan pernah memasukkan seed phrase atau private key di mana pun — airdrop asli tidak pernah memintanya." },
    { n: 4, title: "Pantau progresmu", text: "Tandai proyek dan atur statusnya menjadi Belum Dimulai, Sedang Dikerjakan, atau Selesai di dasbormu, supaya tidak ada yang terlewat." },
  ];
  return (
    <section aria-label="Cara kerja" className="mx-auto w-full max-w-6xl px-4 pt-14">
      <SectionHead id="how" title="Cara Kerjanya" />
      <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <li key={s.n} className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <span
              aria-hidden="true"
              className="font-display grid h-10 w-10 place-items-center rounded-full text-base font-black"
              style={{ backgroundImage: GRADIENT, color: "var(--accent-ink)" }}
            >
              {s.n}
            </span>
            <h3 className="font-display mt-3 text-base font-bold">{s.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--dim)]">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Tutup dialog" onClick={onClose} className="absolute inset-0 bg-black/70" />
      <div className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:rounded-[var(--radius)]">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-xl font-black">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)]"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 5l14 14M19 5L5 19" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProjectModal({
  project,
  onClose,
  onBookmark,
  onTaskStatus,
}: {
  project: Project;
  onClose: () => void;
  onBookmark: (p: Project) => void;
  onTaskStatus: (p: Project, s: TaskStatus) => void;
}) {
  const seg = SEGMENT_META[project.segment];
  return (
    <ModalShell title={project.name} onClose={onClose}>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Chip color={seg.color} bg={seg.bg}>{seg.label}</Chip>
        <span className="text-sm text-[var(--dim)]">{project.status_label}</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-[var(--surface2)] px-3 py-2.5">
          <dt className="text-xs text-[var(--dim)]">Blockchain</dt>
          <dd className="font-semibold">{project.chain}</dd>
        </div>
        <div className="rounded-xl bg-[var(--surface2)] px-3 py-2.5">
          <dt className="text-xs text-[var(--dim)]">Kategori</dt>
          <dd className="font-semibold">{project.category}</dd>
        </div>
        <div className="rounded-xl bg-[var(--surface2)] px-3 py-2.5">
          <dt className="text-xs text-[var(--dim)]">Tingkat Kesulitan</dt>
          <dd className="font-semibold">{DIFFICULTY_LABEL[project.difficulty]}</dd>
        </div>
        <div className="rounded-xl bg-[var(--surface2)] px-3 py-2.5">
          <dt className="text-xs text-[var(--dim)]">Ticker</dt>
          <dd className="font-semibold">{project.ticker ?? "—"}</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm leading-relaxed">{project.description}</p>
      {project.reward_note && (
        <p className="mt-3 rounded-xl bg-[var(--surface2)] px-3 py-2.5 text-sm leading-relaxed">
          <span className="font-semibold text-[var(--accent)]">Distribusi terverifikasi: </span>
          {project.reward_note}
        </p>
      )}
      {project.contract_address && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-[var(--dim)]">ALAMAT KONTRAK</p>
          <p className="mt-1 font-mono text-xs break-all sm:text-sm">{project.contract_address}</p>
          {project.explorer_url && (
            <a href={project.explorer_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-semibold text-[var(--accent)] underline">
              Lihat di explorer
            </a>
          )}
        </div>
      )}
      <div className="mt-4 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm leading-relaxed">
        <p className="font-semibold">Bagaimana proyek ini diverifikasi</p>
        <p className="mt-1 text-[var(--dim)]">
          {project.verified_note} <span className="whitespace-nowrap">(Diperiksa {fmtDateOnly(project.verified_at)}.)</span>
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {project.official_url && (
          <a
            href={project.official_url}
            target="_blank"
            rel="noreferrer"
            className="rounded-full px-4 py-2.5 text-sm font-bold"
            style={{ backgroundImage: GRADIENT, color: "var(--accent-ink)" }}
          >
            Situs Resmi
          </a>
        )}
        {project.x_handle && (
          <span className="rounded-full border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--dim)]">
            X: {project.x_handle}
          </span>
        )}
        <button
          type="button"
          onClick={() => onBookmark(project)}
          aria-pressed={project.bookmarked}
          className="rounded-full border px-4 py-2.5 text-sm font-semibold"
          style={{
            borderColor: project.bookmarked ? "var(--accent)" : "var(--border)",
            color: project.bookmarked ? "var(--accent)" : "var(--text)",
          }}
        >
          {project.bookmarked ? "Sudah Ditandai ✓" : "Tandai"}
        </button>
      </div>
      <div className="mt-5">
        <label htmlFor="task-status" className="text-sm font-semibold">
          Status tugasmu
        </label>
        <select
          id="task-status"
          value={project.task_status}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => onTaskStatus(project, e.target.value as TaskStatus)}
          className={`${selectClass} mt-1.5 w-full`}
        >
          <option value="not_started">Belum Dimulai</option>
          <option value="in_progress">Sedang Dikerjakan</option>
          <option value="completed">Selesai</option>
        </select>
        <p className="mt-1.5 text-xs text-[var(--dim)]">Tersimpan di dasbormu pada perangkat ini.</p>
      </div>
    </ModalShell>
  );
}

function WalletModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell title="Hubungkan Wallet" onClose={onClose}>
      <p className="mt-3 text-sm leading-relaxed text-[var(--dim)]">
        AIRDROP GENERATE adalah platform penemuan yang sifatnya hanya-baca. Menjelajah, menandai,
        dan memantau airdrop — juga mengecek link — tidak pernah memerlukan wallet, jadi koneksi
        wallet memang sengaja belum diaktifkan di sini.
      </p>
      <ul className="mt-4 space-y-2.5 text-sm leading-relaxed">
        <li className="rounded-xl bg-[var(--surface2)] px-3 py-2.5">
          <strong>Kami tidak akan pernah meminta seed phrase atau private key kamu.</strong> Situs
          atau orang yang memintanya adalah penipu — segera tutup.
        </li>
        <li className="rounded-xl bg-[var(--surface2)] px-3 py-2.5">
          Kalau dukungan wallet hadir nanti, sifatnya hanya <strong>lihat saja</strong> (pencarian
          alamat). Platform ini tidak akan pernah memulai transaksi atau memintamu
          menandatanganinya.
        </li>
        <li className="rounded-xl bg-[var(--surface2)] px-3 py-2.5">
          Punya link klaim dari suatu tempat? Jalankan dulu lewat{" "}
          <button type="button" className="font-semibold text-[var(--accent)] underline" onClick={() => { onClose(); go("checker"); }}>
            Cek Link
          </button>{" "}
          sebelum menghubungkan wallet apa pun ke sana.
        </li>
      </ul>
    </ModalShell>
  );
}

function SignalIcon({ status }: { status: Signal["status"] }) {
  if (status === "bahaya")
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="var(--red)">
        <path d="M12 2 1 21h22L12 2zm0 6.5L19.5 19h-15L12 8.5zM11 12v4h2v-4h-2zm0 5v2h2v-2h-2z" />
      </svg>
    );
  if (status === "waspada")
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="var(--amber)">
        <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-1 4h2v7h-2V7zm0 9h2v2h-2v-2z" />
      </svg>
    );
  if (status === "aman")
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="var(--green)">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.6-4-4 1.6-1.6 2.4 2.4 5.4-5.4 1.6 1.6-7 7z" />
      </svg>
    );
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="var(--dim)">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0-20zm-1 9h2v6h-2v-6zm0-4h2v2h-2V7z" />
    </svg>
  );
}

function CheckDetail({ check, onRecheck, rechecking }: { check: Check; onRecheck: (c: Check) => void; rechecking: boolean }) {
  const v = VERDICT[check.verdict];
  return (
    <div className="mt-6">
      <div
        className="rounded-[var(--radius)] border-2 px-4 py-5 text-center"
        style={{ borderColor: v.color, backgroundColor: v.bg }}
      >
        <p className="font-display text-5xl font-black tracking-tight sm:text-6xl" style={{ color: v.color }}>
          {v.label}
        </p>
        <p className="mt-2 text-sm font-medium" style={{ color: v.color }}>
          Skor risiko {check.score}/100
        </p>
        <div className="mx-auto mt-3 h-2 max-w-xs overflow-hidden rounded-full bg-black/30">
          <div className="h-full rounded-full" style={{ width: `${check.score}%`, backgroundColor: v.color }} />
        </div>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[var(--text)]">{v.advice}</p>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-[var(--radius)] bg-[var(--surface)] px-3 py-2.5">
          <dt className="text-xs text-[var(--dim)]">Domain</dt>
          <dd className="font-mono font-semibold break-all">{check.domain}</dd>
        </div>
        <div className="rounded-[var(--radius)] bg-[var(--surface)] px-3 py-2.5">
          <dt className="text-xs text-[var(--dim)]">Dicek pada</dt>
          <dd className="font-medium">{fmtDateTime(check.checked_at)} WIB</dd>
        </div>
        <div className="rounded-[var(--radius)] bg-[var(--surface)] px-3 py-2.5">
          <dt className="text-xs text-[var(--dim)]">Domain terdaftar</dt>
          <dd className="font-medium">
            {check.registered_at
              ? `${fmtDateOnly(check.registered_at.slice(0, 10))}${check.domain_age_days !== null ? ` (umur ${check.domain_age_days} hari)` : ""}`
              : "Tidak diketahui"}
          </dd>
        </div>
        <div className="rounded-[var(--radius)] bg-[var(--surface)] px-3 py-2.5">
          <dt className="text-xs text-[var(--dim)]">Judul halaman</dt>
          <dd className="font-medium break-words">{check.page_title ?? "—"}</dd>
        </div>
      </dl>
      {check.final_url && check.final_url !== check.url && (
        <p className="mt-2 rounded-[var(--radius)] bg-[var(--surface)] px-3 py-2.5 font-mono text-xs break-all text-[var(--dim)]">
          Berakhir di: {check.final_url}
        </p>
      )}

      <h3 className="font-display mt-6 text-lg font-bold">Bukti sinyal</h3>
      <ul className="mt-2 divide-y divide-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)]">
        {check.signals.map((s) => (
          <li key={s.id} className="flex gap-3 px-3 py-3">
            <SignalIcon status={s.status} />
            <div>
              <p className="text-sm font-semibold">{s.label}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-[var(--dim)]">{s.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      {check.contracts.length > 0 && (
        <>
          <h3 className="font-display mt-6 text-lg font-bold">Alamat kontrak / token di halaman</h3>
          <ul className="mt-2 space-y-2">
            {check.contracts.map((c) => (
              <li
                key={c.address}
                className="flex items-center justify-between gap-3 rounded-[var(--radius)] bg-[var(--surface)] px-3 py-2.5"
              >
                <span className="font-mono text-xs break-all sm:text-sm">{c.address}</span>
                <a
                  className="shrink-0 text-sm font-semibold text-[var(--accent)] underline"
                  href={
                    c.chain === "solana"
                      ? `https://solscan.io/token/${c.address}`
                      : `https://etherscan.io/address/${c.address}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Lihat ${c.address} di explorer`}
                >
                  {c.chain === "solana" ? "Solscan" : "Etherscan"}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      <button
        type="button"
        disabled={rechecking}
        onClick={() => onRecheck(check)}
        className="mt-5 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold disabled:opacity-50"
      >
        {rechecking ? "Memeriksa ulang…" : "Cek ulang link ini sekarang"}
      </button>
    </div>
  );
}

function CheckerSection({
  checks,
  loading,
  selected,
  setSelected,
  onCheck,
  checking,
  checkError,
  onDelete,
  deleting,
}: {
  checks: Check[];
  loading: boolean;
  selected: Check | null;
  setSelected: (c: Check | null) => void;
  onCheck: (url: string) => void;
  checking: boolean;
  checkError: string | null;
  onDelete: (id: number) => void;
  deleting: boolean;
}) {
  const [input, setInput] = useState("");
  const shown = selected ?? checks[0] ?? null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const url = input.trim();
    if (!url || checking) return;
    onCheck(url);
  };
  return (
    <section aria-label="Pemeriksa keamanan link" className="mx-auto w-full max-w-6xl px-4 pt-14">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <SectionHead
            id="checker"
            title="Cek Link Airdrop"
            blurb="Tempel link airdrop atau klaim apa pun yang kamu dapat dari X, Telegram, atau grup — sebelum kamu membukanya. Pemeriksa ini membaca kode halaman dan data pendaftaran domainnya: domain drainer yang sudah terbukti, seluruh rantai redirect, permintaan connect wallet, kode penandatanganan transaksi, alamat kontrak (formatnya divalidasi terhadap chain yang diklaim halaman), umur domain, dan bahasa iming-iming klaim. Setiap sinyal menunjukkan apa yang ditemukan dan persis berapa pengaruhnya terhadap skor."
          />
          <form onSubmit={submit} className="mt-5">
            <label htmlFor="link-input" className="text-sm font-semibold">
              Link yang mau dicek
            </label>
            <input
              id="link-input"
              type="text"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              placeholder="https://contoh-airdrop.xyz/claim"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="mt-1.5 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-3.5 font-mono text-sm outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={checking || input.trim().length === 0}
              className="font-display mt-3 w-full rounded-full px-4 py-4 text-lg font-black tracking-wide disabled:opacity-50"
              style={{ backgroundImage: GRADIENT, color: "var(--accent-ink)" }}
            >
              {checking ? "MEMERIKSA…" : "CEK LINK INI"}
            </button>
            {checking && (
              <p className="mt-2 text-center text-sm text-[var(--dim)]">
                Menghubungi situsnya, membaca kode halamannya, dan mengecek umur domain…
              </p>
            )}
            {checkError && (
              <p role="alert" className="mt-2 rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium" style={{ color: "var(--red)", backgroundColor: "var(--red-bg)" }}>
                {checkError}
              </p>
            )}
          </form>
          <button
            type="button"
            className="mt-3 text-left text-sm text-[var(--dim)] underline"
            onClick={() => setInput("https://scamsem.solbarn.cc/")}
          >
            Isi contoh: link yang menguras wallet pada 7 Nov 2026 (scamsem.solbarn.cc)
          </button>

          <h3 className="font-display mt-8 text-lg font-bold">Riwayat pemeriksaan</h3>
          {loading ? (
            <p className="mt-2 text-sm text-[var(--dim)]">Memuat riwayat…</p>
          ) : checks.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--dim)]">
              Belum ada pemeriksaan. Hasil cek pertamamu akan tersimpan di sini.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)]">
              {checks.map((c) => {
                const v = VERDICT[c.verdict];
                const isShown = shown?.id === c.id;
                return (
                  <li key={c.id} className="flex items-center gap-3 px-3 py-3">
                    <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: v.color }} />
                    <button
                      type="button"
                      onClick={() => setSelected(c)}
                      className="min-w-0 flex-1 text-left"
                      aria-label={`Lihat hasil cek ${c.domain}`}
                    >
                      <span className="block truncate font-mono text-sm font-semibold">
                        {c.domain}
                        {isShown ? " · sedang ditampilkan" : ""}
                      </span>
                      <span className="block text-xs text-[var(--dim)]">
                        {v.label} · skor {c.score} · {fmtDateTime(c.checked_at)} WIB
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Hapus riwayat cek ${c.domain}`}
                      disabled={deleting}
                      onClick={() => onDelete(c.id)}
                      className="shrink-0 rounded-full p-2 text-[var(--dim)] disabled:opacity-50"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                        <path d="M9 3h6l1 2h4v2H4V5h4l1-2zM6 9h12l-1 12H7L6 9zm4 2v8h2v-8h-2zm4 0v8h2v-8h-2z" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div aria-live="polite">
          {shown ? (
            <CheckDetail check={shown} rechecking={checking} onRecheck={(c) => onCheck(c.url)} />
          ) : (
            <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] px-4 py-10 text-center text-sm leading-relaxed text-[var(--dim)]">
              Hasil pemeriksaan terakhir akan tampil di sini — lengkap dengan cap BAHAYA / WASPADA /
              LEBIH AMAN dan bukti sinyalnya satu per satu.
            </div>
          )}
        </div>
      </div>
      <p className="mt-8 max-w-3xl text-xs leading-relaxed text-[var(--dim)]">
        Pemeriksa membaca kode halaman secara statis, mengikuti rantai redirect-nya selangkah
        demi selangkah, dan membaca data pendaftaran domain (RDAP) — tanpa menjalankan script
        situs dan tanpa connect wallet. Domain yang terbukti menguras wallet (solbarn.cc dan
        sharkmoon.tech, dari kejadian 7 Nov 2026) selalu divonis BAHAYA, termasuk bila hanya
        dilewati oleh rantai redirect. Vonis hijau bukan jaminan: situs bisa berubah setelah
        dicek, dan tanda tangan transaksi tetap harus dibaca satu per satu di wallet.
      </p>
    </section>
  );
}

function GuideSection() {
  const guides = [
    {
      title: "Sebelum mengklik: cek link 60 detik",
      body: "Tempel link-nya ke pemeriksa di atas sebelum membukanya. Halaman klaim di domain yang baru berumur beberapa hari, tanpa alamat kontrak dan tanpa tautan sosial resmi, adalah pola klasik drainer — pola persis di balik pengurasan wallet pada 7 Nov 2026 yang terdokumentasi di platform ini.",
    },
    {
      title: "Baca kontraknya, bukan hitung mundurnya",
      body: "Proyek asli selalu bisa menunjukkan alamat kontraknya. Buka alamat itu di explorer chain-nya: cek tanggal deploy, jumlah holder, dan apakah alamatnya cocok dengan yang diumumkan kanal resmi proyek. Tidak ada alamat, tidak ada kepercayaan.",
    },
    {
      title: "Connect bukan bahayanya — tanda tanganlah bahayanya",
      body: "Menghubungkan wallet hanya membuka alamat publikmu. Pengurasan terjadi pada langkah tanda tangan: satu persetujuan signTransaction bisa memindahkan semuanya. Pakai wallet kosong terpisah (burner) untuk apa pun yang belum terbukti, dan jangan pernah menandatangani transaksi yang tidak bisa kamu baca.",
    },
    {
      title: "Gratis berarti gratis: audit radarmu sendiri",
      body: "“Free mint” yang diam-diam menambahkan biaya pemrosesan, tingkatan berbayar, atau langkah pembayaran di luar situs bukanlah gratis. Katalog di halaman ini hanya memuat peluang yang jalur gratisnya sudah di-preview dan terkonfirmasi bernilai 0 — pakai standar yang sama untuk apa pun yang kamu temukan di tempat lain.",
    },
  ];
  return (
    <section aria-label="Panduan airdrop" className="mx-auto w-full max-w-6xl px-4 pt-14">
      <SectionHead
        id="guide"
        title="Panduan"
        blurb="Panduan singkat dan praktis untuk berburu airdrop tanpa menjadi imbalan yang diklaim orang lain."
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {guides.map((g, i) => (
          <article key={g.title} className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="text-xs font-bold tracking-wide text-[var(--accent)]">PANDUAN {i + 1}</p>
            <h3 className="font-display mt-1.5 text-lg font-bold">{g.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--dim)]">{g.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function DashboardSection({
  projects,
  checks,
  onDetails,
  onTaskStatus,
  onBookmark,
}: {
  projects: Project[];
  checks: Check[];
  onDetails: (p: Project) => void;
  onTaskStatus: (p: Project, s: TaskStatus) => void;
  onBookmark: (p: Project) => void;
}) {
  // C2: tracked + counts dihitung sekali per perubahan data, bukan tiap
  // render (sebelumnya 1x + 3x `.filter()` per render).
  const tracked = useMemo(
    () => projects.filter((p) => p.bookmarked || p.task_status !== "not_started"),
    [projects],
  );
  const counts = useMemo(
    () => ({
      inProgress: tracked.filter((p) => p.task_status === "in_progress").length,
      completed: tracked.filter((p) => p.task_status === "completed").length,
      flagged: checks.filter((c) => c.verdict === "bahaya").length,
    }),
    [tracked, checks],
  );
  return (
    <section aria-label="Dasbor airdrop kamu" className="mx-auto w-full max-w-6xl px-4 pt-14">
      <SectionHead
        id="dashboard"
        title="Dasbor Kamu"
        blurb="Semua yang kamu tandai atau mulai, lengkap dengan status tugasnya — plus catatan keamanan link kamu."
      />
      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Proyek yang dipantau", value: tracked.length },
          { label: "Sedang dikerjakan", value: counts.inProgress },
          { label: "Selesai", value: counts.completed },
          { label: "Link yang divonis BAHAYA", value: counts.flagged },
        ].map((s) => (
          <div key={s.label} className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
            <dd className="font-display text-2xl font-black">{s.value}</dd>
            <dt className="mt-0.5 text-xs text-[var(--dim)]">{s.label}</dt>
          </div>
        ))}
      </dl>
      {tracked.length === 0 ? (
        <p className="mt-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-sm leading-relaxed text-[var(--dim)]">
          Belum ada yang dipantau. Ketuk ikon tanda pada proyek mana pun di{" "}
          <button type="button" className="font-semibold text-[var(--accent)] underline" onClick={() => go("explore")}>
            Jelajahi Airdrop
          </button>{" "}
          dan proyek itu akan muncul di sini lengkap dengan status tugasnya.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--border)] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
          {tracked.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-display truncate text-sm font-bold">{p.name}</p>
                <p className="text-xs text-[var(--dim)]">
                  {p.chain} · {p.category} · {SEGMENT_META[p.segment].label} — {p.status_label}
                </p>
              </div>
              <label className="sr-only" htmlFor={`dash-status-${p.id}`}>
                Status tugas untuk {p.name}
              </label>
              <select
                id={`dash-status-${p.id}`}
                value={p.task_status}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => onTaskStatus(p, e.target.value as TaskStatus)}
                className={selectClass}
              >
                <option value="not_started">Belum Dimulai</option>
                <option value="in_progress">Sedang Dikerjakan</option>
                <option value="completed">Selesai</option>
              </select>
              <button
                type="button"
                onClick={() => onDetails(p)}
                className="rounded-full border border-[var(--border)] px-3 py-2 text-sm font-semibold"
              >
                Detail
              </button>
              <BookmarkButton
                active={p.bookmarked}
                onToggle={() => onBookmark(p)}
                label={p.bookmarked ? `Hapus tanda untuk ${p.name}` : `Tandai ${p.name}`}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AboutSection() {
  return (
    <section aria-label="Tentang AIRDROP GENERATE" className="mx-auto w-full max-w-6xl px-4 pt-14">
      <SectionHead id="about" title="Tentang AIRDROP GENERATE" />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5 text-sm leading-relaxed text-[var(--dim)]">
          <StackedLogo width={170} />
          <p className="mt-4 font-semibold text-[var(--text)]">
            Dibangun oleh anak bangsa Indonesia.
          </p>
          <p className="mt-2">
            Airdrop Generate merupakan inisiatif yang dikembangkan oleh tim Indonesia dengan
            tujuan membangun platform informasi dan keamanan bagi pengguna Web3. Kami ingin
            menghadirkan ruang bagi pengguna untuk menjelajahi peluang airdrop, mengenali potensi
            risiko, serta memperoleh informasi yang lebih terarah sebelum berinteraksi dengan
            berbagai proyek kripto.
          </p>
          <p className="mt-3">
            Melalui fitur seperti Link Scanner, Threat Intelligence, dan analisis berbasis AI,
            Airdrop Generate terus dikembangkan untuk membantu pengguna lebih waspada terhadap
            berbagai potensi penipuan di ekosistem Web3.
          </p>
          <p className="mt-3">
            Saat ini, Airdrop Generate masih berada dalam tahap pengembangan dan pengujian.
            Fitur, sistem, serta hasil analisis kami masih terus dievaluasi dan disempurnakan.
            Kami tidak mengklaim dapat menjamin keamanan setiap proyek atau tautan, tetapi
            berkomitmen untuk terus meningkatkan kualitas informasi dan perlindungan yang kami
            hadirkan.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
            <h3 className="font-display text-base font-bold">Standar keamanan kami</h3>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-[var(--dim)]">
              <li>— Kami tidak pernah meminta seed phrase atau private key. Tidak ada pihak yang sah yang memintanya.</li>
              <li>— Tidak ada fitur wallet di sini yang bisa memulai atau menandatangani transaksi.</li>
              <li>— Imbalan hanya ditampilkan bila distribusinya benar-benar teramati dan ada sumbernya.</li>
              <li>— Fase yang sudah berakhir dan yang berbayar dilabeli apa adanya — tidak pernah dikemas seolah masih berjalan.</li>
              <li>— Vonis hijau dari pemeriksa berarti “tidak ada bahaya yang terdeteksi”, bukan “dijamin aman”.</li>
            </ul>
          </div>
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-5">
            <h3 className="font-display text-base font-bold">Kredit Pembuat</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--dim)]">
              AIRDROP GENERATE dibuat dan dikelola oleh <strong className="text-[var(--text)]">Rama</strong>,
              anak bangsa Indonesia, dari pengalaman nyata kehilangan aset karena link klaim
              palsu — supaya orang lain tidak perlu mengalami hal yang sama.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--dim)]">
              Instagram: <span className="text-[var(--text)]">segera hadir</span> — tautan akun
              resmi pembuat akan ditambahkan di sini begitu pemiliknya memberikannya.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const nav: { label: string; target: string }[] = [
    { label: "Beranda", target: "home" },
    { label: "Jelajahi Airdrop", target: "explore" },
    { label: "Segera Hadir", target: "upcoming" },
    { label: "Kategori", target: "categories" },
    { label: "Cek Link", target: "checker" },
    { label: "Panduan", target: "guide" },
    { label: "Dasbor", target: "dashboard" },
    { label: "Tentang", target: "about" },
  ];
  return (
    <footer className="mt-16 border-t border-[var(--border)]" style={{ backgroundColor: "var(--bg2)" }}>
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <StackedLogo width={150} />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--dim)]">
            Penemuan airdrop terverifikasi untuk ekosistem Web3 — jelajahi peluang, cek setiap link
            sebelum kamu connect, dan pantau progresmu di satu tempat.
          </p>
          <p className="mt-4 text-[11px] leading-relaxed text-[var(--dim)]">
            AIRDROP GENERATE belum punya akun sosial resmi — waspadai akun yang mengatasnamakan
            platform ini. Kanal resmi setiap proyek ada di kartu detailnya (tombol Lihat Detail).
          </p>
        </div>
        <nav aria-label="Navigasi footer">
          <h3 className="font-display text-sm font-bold tracking-wide">NAVIGASI</h3>
          <ul className="mt-3 space-y-2">
            {nav.map((n) => (
              <li key={n.target}>
                <button type="button" onClick={() => go(n.target)} className="text-sm text-[var(--dim)] transition-colors hover:text-[var(--text)]">
                  {n.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h3 className="font-display text-sm font-bold tracking-wide">DIBUAT OLEH</h3>
          <p className="mt-3 text-xs leading-relaxed text-[var(--dim)]">
            <strong className="text-[var(--text)]">Rama</strong> — anak bangsa Indonesia. Platform
            ini dibangun dari pengalaman nyata kehilangan aset karena link klaim palsu, dengan misi
            membantu orang Indonesia agar tidak tertipu dan membagikan airdrop yang sudah
            diverifikasi.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-[var(--dim)]">
            Instagram: <span className="text-[var(--text)]">segera hadir</span> — tautan akun resmi
            pembuat akan ditambahkan di sini begitu pemiliknya memberikannya.
          </p>
        </div>
        <div>
          <h3 className="font-display text-sm font-bold tracking-wide">DISCLAIMER</h3>
          <p className="mt-3 text-xs leading-relaxed text-[var(--dim)]">
            Tidak ada satu pun isi AIRDROP GENERATE yang merupakan nasihat keuangan. Daftar airdrop
            mencerminkan verifikasi on-chain yang dilakukan pada tanggal yang tertera di setiap
            kartu; proyek bisa berubah, berhenti, atau mengakhiri programnya kapan saja, dan nilai
            token bisa jatuh sampai nol. Pemeriksa link membaca kode halaman dan data domain — ia
            tidak bisa menjamin situs atau transaksi apa pun aman. Selalu verifikasi lewat kanal
            resmi proyek, pakai wallet kosong (burner) untuk apa pun yang belum terbukti, dan
            jangan pernah membagikan seed phrase atau private key kamu kepada siapa pun.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 border-t border-[var(--border)] py-4 text-center text-xs text-[var(--dim)]">
        <LogoMark size={18} />
        <span>© 2026 AIRDROP GENERATE — Temukan. Verifikasi. Lalu klaim. Dibangun oleh anak bangsa Indonesia.</span>
      </div>
    </footer>
  );
}

type ChatMessage = { role: "user" | "assistant"; content: string };

const GIBRAN_WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "Halo! Aku Gibran, asisten AIRDROP GENERATE. Aku bisa bantu jawab soal airdrop di katalog, cara pakai cek link, dan tips keamanan wallet. Mau tanya apa?",
};

const GIBRAN_SUGGESTIONS = [
  "Airdrop apa saja yang sedang live?",
  "Bagaimana cara cek link airdrop?",
  "Tips aman supaya tidak kena drainer?",
  "Proyek apa saja di kategori NFT?",
];

function GibranChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GIBRAN_WELCOME]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const askMut = useMutation({
    mutationFn: (payload: { message: string; history: ChatMessage[] }) =>
      api.askGibran(payload),
    onSuccess: (data) => {
      setMessages((cur) => [...cur, { role: "assistant", content: data.reply }]);
    },
    onError: () => {
      setMessages((cur) => [
        ...cur,
        {
          role: "assistant",
          content:
            "Maaf, aku lagi tidak bisa menjawab sekarang. Coba lagi sebentar ya — atau jelajahi langsung katalog dan panduan keamanan di halaman ini.",
        },
      ]);
    },
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, askMut.isPending, open]);

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || askMut.isPending) return;
    const history = messages.slice(-10);
    setMessages((cur) => [...cur, { role: "user", content: text }]);
    setDraft("");
    askMut.mutate({ message: text, history });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(draft);
  };

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Gibran — Asisten Airdrop"
          className="fixed inset-x-3 bottom-24 z-40 flex max-h-[min(560px,calc(100dvh-8.5rem))] flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-2xl shadow-black/60 sm:inset-x-auto sm:right-6 sm:bottom-28 sm:w-[380px]"
        >
          <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3" style={{ backgroundColor: "var(--surface2)" }}>
            <img
              src={gibranMascot}
              alt="Gibran, maskot AIRDROP GENERATE"
              className="h-11 w-11 shrink-0 rounded-full border border-[var(--border)] object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="font-display truncate text-base font-bold">Gibran — Asisten Airdrop</p>
              <p className="text-xs text-[var(--dim)]">Menjawab dari katalog &amp; panduan situs ini</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup chat Gibran"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)]"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </button>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3" aria-live="polite">
            {messages.map((m, i) =>
              m.role === "assistant" ? (
                <div key={i} className="flex items-start gap-2">
                  <img
                    src={gibranMascot}
                    alt=""
                    aria-hidden="true"
                    className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover"
                  />
                  <p className="max-w-[85%] rounded-2xl rounded-tl-md bg-[var(--surface2)] px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                    {m.content}
                  </p>
                </div>
              ) : (
                <div key={i} className="flex justify-end">
                  <p
                    className="max-w-[85%] rounded-2xl rounded-tr-md px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ backgroundImage: GRADIENT, color: "var(--accent-ink)" }}
                  >
                    {m.content}
                  </p>
                </div>
              ),
            )}
            {askMut.isPending && (
              <div className="flex items-start gap-2">
                <img
                  src={gibranMascot}
                  alt=""
                  aria-hidden="true"
                  className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover"
                />
                <p className="rounded-2xl rounded-tl-md bg-[var(--surface2)] px-3 py-2.5 text-sm text-[var(--dim)]">
                  Gibran sedang mengetik…
                </p>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 px-3 pb-2">
              {GIBRAN_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--dim)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text)]"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="flex items-center gap-2 border-t border-[var(--border)] px-3 py-3">
            <label htmlFor="gibran-input" className="sr-only">
              Tulis pesan untuk Gibran
            </label>
            <input
              id="gibran-input"
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Tanya soal airdrop, cek link, keamanan…"
              maxLength={1000}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={askMut.isPending || draft.trim().length === 0}
              aria-label="Kirim pesan ke Gibran"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full disabled:opacity-50"
              style={{ backgroundImage: GRADIENT, color: "var(--accent-ink)" }}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M3.4 20.4 21.8 12 3.4 3.6l-.01 6.53L14 12 3.39 13.87z" />
              </svg>
            </button>
          </form>
          <p className="border-t border-[var(--border)] px-3 py-2 text-center text-[11px] leading-relaxed text-[var(--dim)]">
            Gibran tidak pernah meminta seed phrase atau private key. Ini bukan nasihat keuangan.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Tutup chat Gibran" : "Buka chat dengan Gibran — Asisten Airdrop"}
        className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <span className="relative block">
          <img
            src={gibranMascot}
            alt=""
            aria-hidden="true"
            className="h-16 w-16 rounded-full border-2 object-cover transition-transform hover:scale-105"
            style={{ borderColor: "var(--accent)", boxShadow: "0 0 22px rgba(240,185,11,0.5)" }}
          />
          <span
            className="font-display absolute -top-1.5 -left-3 rounded-full px-2 py-0.5 text-[10px] font-black tracking-wide"
            style={{ backgroundImage: GRADIENT, color: "var(--accent-ink)" }}
          >
            GIBRAN
          </span>
          {open && (
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/55 text-white">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </span>
          )}
        </span>
      </button>
    </>
  );
}

export function App() {
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.type = "image/png";
    link.href = faviconPng;
  }, []);

  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [chain, setChain] = useState("All");
  const [segment, setSegment] = useState("All");
  const [category, setCategory] = useState("All");
  const [detail, setDetail] = useState<Project | null>(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<Check | null>(null);
  // C7: pesan kesalahan aksi (bookmark/status, cek link, hapus riwayat) —
  // sebelumnya kegagalan deleteMut/stateMut tidak terlihat sama sekali
  // oleh pengguna.
  const [actionError, setActionError] = useState<string | null>(null);

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.listProjects({}),
  });
  const history = useQuery({
    queryKey: ["checks"],
    queryFn: () => api.listChecks({ limit: 100 }),
  });

  const stateMut = useMutation({
    mutationFn: (args: { projectId: number; bookmarked?: boolean; taskStatus?: TaskStatus }) =>
      api.setProjectState(args),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
    onError: (err) =>
      setActionError(
        `Gagal menyimpan perubahan proyek: ${err instanceof Error ? err.message : "terjadi kesalahan"}. Coba lagi.`,
      ),
  });

  const checkMut = useMutation({
    mutationFn: (url: string) => api.checkLink({ url }),
    onSuccess: (result) => {
      setSelectedCheck(result);
      queryClient.invalidateQueries({ queryKey: ["checks"] });
      go("checker");
    },
    onError: (err) =>
      setActionError(
        `Pemeriksaan link gagal: ${err instanceof Error ? err.message : "terjadi kesalahan"}. Coba lagi.`,
      ),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.deleteCheck({ id }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["checks"] });
      setSelectedCheck((cur) => (cur && cur.id === id ? null : cur));
    },
    onError: (err) =>
      setActionError(
        `Gagal menghapus riwayat pemeriksaan: ${err instanceof Error ? err.message : "terjadi kesalahan"}. Coba lagi.`,
      ),
  });

  const projects = projectsQuery.data?.projects ?? [];
  const checks = history.data?.checks ?? [];

  const toggleBookmark = (p: Project) =>
    stateMut.mutate({ projectId: p.id, bookmarked: !p.bookmarked });
  const changeTaskStatus = (p: Project, s: TaskStatus) => {
    stateMut.mutate({ projectId: p.id, taskStatus: s });
    setDetail((cur) => (cur && cur.id === p.id ? { ...cur, task_status: s } : cur));
  };
  const openDetails = (p: Project) => setDetail(p);
  // C1: detailFresh + stats dihitung sekali per perubahan data, bukan
  // tiap render.
  const detailFresh = useMemo(
    () => (detail ? (projects.find((p) => p.id === detail.id) ?? detail) : null),
    [detail, projects],
  );

  const stats = useMemo(
    () => [
      { label: "Proyek terverifikasi di katalog", value: String(projects.length) },
      { label: "Peluang gratis yang sedang berjalan", value: String(projects.filter((p) => p.segment === "live").length) },
      { label: "Link yang sudah diperiksa", value: String(checks.length) },
      { label: "Link yang divonis BAHAYA", value: String(checks.filter((c) => c.verdict === "bahaya").length) },
    ],
    [projects, checks],
  );

  const pickCategory = (c: Category) => {
    setCategory(c);
    setSegment("All");
    go("explore");
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <SafeAreaTopScrim backgroundColor="var(--bg)" />
      <Navbar onConnect={() => setWalletOpen(true)} />
      <main>
        {actionError && (
          <div role="alert" className="mx-auto mt-4 w-full max-w-6xl px-4">
            <div className="flex items-start gap-3 rounded-[var(--radius)] border border-red-400/60 bg-red-500/10 px-4 py-3 text-sm">
              <span className="min-w-0 flex-1">{actionError}</span>
              <button
                type="button"
                onClick={() => setActionError(null)}
                aria-label="Tutup pesan kesalahan"
                className="shrink-0 font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}
        <Hero query={query} setQuery={setQuery} stats={stats} />
        <ExploreSection
          projects={projects}
          loading={projectsQuery.isPending}
          query={query}
          setQuery={setQuery}
          chain={chain}
          setChain={setChain}
          segment={segment}
          setSegment={setSegment}
          category={category}
          setCategory={setCategory}
          onDetails={openDetails}
          onBookmark={toggleBookmark}
        />
        <UpcomingSection projects={projects} onDetails={openDetails} onBookmark={toggleBookmark} />
        <CategoriesSection projects={projects} onPick={pickCategory} />
        <HowItWorks />
        <CheckerSection
          checks={checks}
          loading={history.isPending}
          selected={selectedCheck}
          setSelected={setSelectedCheck}
          onCheck={(url) => checkMut.mutate(url)}
          checking={checkMut.isPending}
          checkError={
            checkMut.isError
              ? checkMut.error instanceof Error
                ? checkMut.error.message
                : "Pemeriksaan gagal. Coba lagi."
              : null
          }
          onDelete={(id) => deleteMut.mutate(id)}
          deleting={deleteMut.isPending}
        />
        <GuideSection />
        <DashboardSection
          projects={projects}
          checks={checks}
          onDetails={openDetails}
          onTaskStatus={changeTaskStatus}
          onBookmark={toggleBookmark}
        />
        <AboutSection />
      </main>
      <Footer />
      {detailFresh && (
        <ProjectModal
          project={detailFresh}
          onClose={() => setDetail(null)}
          onBookmark={toggleBookmark}
          onTaskStatus={changeTaskStatus}
        />
      )}
      {walletOpen && <WalletModal onClose={() => setWalletOpen(false)} />}
      <GibranChat />
    </div>
  );
}
