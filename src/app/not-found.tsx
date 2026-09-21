import Link from "next/link";
import { HiOutlineArrowLeft } from "react-icons/hi";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="microlabel text-primary">Error 404</p>
      <p className="num mt-4 text-7xl font-semibold tracking-tighter text-primary/25 select-none">
        404
      </p>
      <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <HiOutlineArrowLeft className="h-4 w-4" />
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
