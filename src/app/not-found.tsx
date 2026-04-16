import Link from "next/link";
import { HiOutlineArrowLeft, HiOutlineExclamationCircle } from "react-icons/hi";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
        <h1 className="relative text-9xl font-black text-primary/20 select-none">
          404
        </h1>
      </div>
      
      <h2 className="text-3xl font-bold mb-4 tracking-tight">Halaman Tidak Ditemukan</h2>
      <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
        Maaf, halaman yang Anda cari tidak tersedia atau telah dipindahkan. Silakan kembali ke dashboard.
      </p>
      
      <Link
        href="/"
        className="flex items-center space-x-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
      >
        <HiOutlineArrowLeft className="w-5 h-5" />
        <span>Kembali ke Dashboard</span>
      </Link>
    </div>
  );
}
