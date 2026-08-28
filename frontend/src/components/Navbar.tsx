"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

interface Props {
  showNavSwitcher?: boolean;
}

export default function Navbar({ showNavSwitcher = true }: Props) {
  const pathname = usePathname();

  if (!showNavSwitcher) return null;

  return (
    <div className="pt-3 pb-2 flex items-center justify-center shrink-0 select-none">
      <div className="flex items-center rounded-full bg-[#f4f4f4] h-10 shadow-[0_0_12px_rgba(0,0,0,0.06)] border border-neutral-200/60 p-1">
        <Link
          href="/"
          className={`flex items-center justify-center rounded-full px-5 py-1.5 text-xs transition-all ${
            pathname === "/"
              ? "bg-white text-neutral-900 font-semibold shadow-[0_0_8px_rgba(0,0,0,0.08)]"
              : "text-[#8e8e93] font-medium hover:text-neutral-900"
          }`}
        >
          Notes
        </Link>
        <Link
          href="/architecture"
          className={`flex items-center justify-center rounded-full px-5 py-1.5 text-xs transition-all ${
            pathname === "/architecture"
              ? "bg-white text-neutral-900 font-semibold shadow-[0_0_8px_rgba(0,0,0,0.08)]"
              : "text-[#8e8e93] font-medium hover:text-neutral-900"
          }`}
        >
          Architecture
        </Link>
      </div>
    </div>
  );
}
