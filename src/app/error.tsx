"use client";

import Link from "next/link";
import { useEffect } from "react";
import { HiOutlineArrowLeft, HiOutlineRefresh } from "react-icons/hi";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="microlabel text-destructive">Error 500</p>
      <p className="num mt-4 text-7xl font-semibold tracking-tighter text-destructive/25 select-none">
        500
      </p>
      <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">
        Terjadi kesalahan server
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        Ada masalah di sisi kami. Coba muat ulang halaman.
      </p>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={() => reset()}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <HiOutlineRefresh className="h-4 w-4" />
          Coba Lagi
        </button>
        <Link
          href="/"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold transition-colors hover:bg-secondary"
        >
          <HiOutlineArrowLeft className="h-4 w-4" />
          Ke Beranda
        </Link>
      </div>

      {error.digest && (
        <p className="num mt-6 rounded bg-secondary px-2 py-1 text-[11px] text-muted-foreground">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
