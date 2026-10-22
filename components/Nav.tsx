"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/menus", label: "Menus" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Goals" },
];

export default function Nav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-30 bg-brand-600 text-white shadow">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2">
        <Link href="/" className="mr-2 text-lg font-bold tracking-tight">
          SB<span className="font-light">Nutrition</span>
        </Link>
        <nav className="hidden flex-1 gap-1 text-sm sm:flex">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap rounded-md px-2.5 py-1.5 ${active ? "bg-white/20 font-semibold" : "hover:bg-white/10"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1 sm:hidden" />
        {status === "authenticated" ? (
          <div className="flex items-center gap-2">
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
            ) : null}
            <button onClick={() => signOut({ callbackUrl: "/" })} className="rounded-md px-2 py-1 text-sm hover:bg-white/10">
              Sign out
            </button>
          </div>
        ) : status === "unauthenticated" ? (
          <button onClick={() => signIn("google")} className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-brand-600">
            Sign in
          </button>
        ) : null}
      </div>
      {/* Mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] text-xs text-stone-600 sm:hidden">
        {LINKS.map((l) => {
          const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} className={`py-3 text-center ${active ? "font-semibold text-brand-600" : ""}`}>
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
