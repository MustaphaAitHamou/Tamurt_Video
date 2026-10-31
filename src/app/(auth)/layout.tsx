import Image from "next/image";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <Image
        src="/demo/titles/le-chant-de-lakfadou/backdrop.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover opacity-40"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/70 via-background/85 to-background" aria-hidden />
      <div className="bg-tamurt-pattern absolute inset-0 -z-10 opacity-70" aria-hidden />
      <header className="px-4 py-5 sm:px-8">
        <Link href="/" aria-label="Tamurt Vidéo — accueil" className="inline-block">
          <Logo className="h-8" />
        </Link>
      </header>
      <main id="contenu" className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md animate-fade-up rounded-3xl border bg-card/90 p-7 shadow-2xl backdrop-blur-xl sm:p-9">
          {children}
        </div>
      </main>
    </div>
  );
}
