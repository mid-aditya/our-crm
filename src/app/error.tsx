"use client";

import { useEffect } from "react";
import { HiOutlineRefresh, HiOutlineServer } from "react-icons/hi";

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
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-destructive/20 blur-3xl rounded-full" />
        <h1 className="relative text-9xl font-black text-destructive/20 select-none">
          500
        </h1>
        <div className="absolute inset-0 flex items-center justify-center">
          <HiOutlineServer className="w-20 h-20 text-destructive animate-bounce" />
        </div>
      </div>
      
      <h2 className="text-3xl font-bold mb-4 tracking-tight">Kesalahan Server Terjadi</h2>
      <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
        Terjadi masalah pada server kami (Error 500/505). Kami sedang berusaha memperbaikinya secepat mungkin.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => reset()}
          className="flex items-center justify-center space-x-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
        >
          <HiOutlineRefresh className="w-5 h-5" />
          <span>Coba Lagi</span>
        </button>
        
        <a
          href="/"
          className="flex items-center justify-center space-x-2 bg-secondary text-foreground px-6 py-3 rounded-xl font-bold border border-border hover:bg-secondary/80 transition-all active:scale-95"
        >
          <span>Ke Beranda</span>
        </a>
      </div>
      
      {error.digest && (
        <p className="mt-8 text-xs font-mono text-muted-foreground bg-secondary/50 px-3 py-1 rounded">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
