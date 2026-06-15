"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Ringkasan" },
  { href: "/transactions", label: "Transaksi" },
  { href: "/settings", label: "Pengaturan" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <>
      {links.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-1.5 text-sm transition hover:bg-muted ${
              active ? "bg-muted font-medium" : "text-muted-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
