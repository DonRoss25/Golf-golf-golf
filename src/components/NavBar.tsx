"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/rounds/new", label: "New Round" },
  { href: "/courses", label: "Courses" },
  { href: "/skins", label: "Skins" },
  { href: "/closest-to-pin", label: "Closest to Pin" },
  { href: "/social", label: "Social" },
  { href: "/pga-tour", label: "PGA Tour" },
];

export function NavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="border-b border-fairway-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-fairway-700">
          ⛳ Golf Golf Golf
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-1.5 transition ${
                pathname === link.href
                  ? "bg-fairway-600 text-white"
                  : "text-fairway-700 hover:bg-fairway-50"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {session ? (
            <button onClick={() => signOut()} className="ml-2 rounded-md px-3 py-1.5 text-fairway-700 hover:bg-fairway-50">
              Sign out
            </button>
          ) : (
            <Link href="/login" className="ml-2 rounded-md px-3 py-1.5 text-fairway-700 hover:bg-fairway-50">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
