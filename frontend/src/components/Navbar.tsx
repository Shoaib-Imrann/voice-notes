"use client";

import { Github, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState, useTransition } from "react";

interface Props {
  showNavSwitcher?: boolean;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export default function Navbar({
  showNavSwitcher = true,
  onToggleSidebar,
  isSidebarOpen = true,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [activePath, setActivePath] = useState(pathname);
  const [, startTransition] = useTransition();

  // Keep state in sync with URL changes
  useEffect(() => {
    setActivePath(pathname);
  }, [pathname]);

  // Prefetch routes for instantaneous transitions
  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/architecture");
  }, [router]);

  if (!showNavSwitcher) return null;

  const isArch = activePath === "/architecture";

  const handleNavigate = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (activePath === href) return;
    setActivePath(href);
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <header className="relative w-full pt-4 pb-2 px-4 flex items-center justify-center shrink-0 select-none">
      {/* Left Slot: Mobile Open Sidebar Button (when sidebar is closed) */}
      <div className="absolute left-4 top-4 flex items-center">
        {onToggleSidebar && !isSidebarOpen && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="sm:hidden flex h-9 w-9 items-center justify-center rounded-full bg-white border border-neutral-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-neutral-700 hover:text-neutral-900 transition cursor-pointer"
            title="Open sidebar"
            aria-label="Open sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dead Center: Segmented Switcher */}
      <nav
        aria-label="Main Navigation"
        className="relative inline-flex items-center rounded-full bg-neutral-100 border border-neutral-200/80 h-9 p-0 shadow-[0_1px_2px_rgba(0,0,0,0.03)] mx-auto"
      >
        {/* Full-height sliding active pill touching container bounds with spring-like smooth ease */}
        <div
          className={`absolute inset-y-0 left-0 w-28 rounded-full bg-white border border-neutral-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] pointer-events-none will-change-transform ${
            isArch ? "translate-x-full" : "translate-x-0"
          }`}
        />

        <Link
          href="/"
          onClick={(e) => handleNavigate("/", e)}
          className={`relative z-10 w-28 h-full flex items-center justify-center text-xs rounded-full transition-colors duration-200 ${
            !isArch
              ? "text-neutral-900 font-semibold"
              : "text-neutral-500 hover:text-neutral-800 font-medium"
          }`}
        >
          Notes
        </Link>
        <Link
          href="/architecture"
          onClick={(e) => handleNavigate("/architecture", e)}
          className={`relative z-10 w-28 h-full flex items-center justify-center text-xs rounded-full transition-colors duration-200 ${
            isArch
              ? "text-neutral-900 font-semibold"
              : "text-neutral-500 hover:text-neutral-800 font-medium"
          }`}
        >
          Architecture
        </Link>
      </nav>

      {/* Right Slot: Circular Repository Icon Button */}
      <div className="absolute right-4 top-4 flex items-center">
        <a
          href="https://github.com/Shoaib-Imrann/voice-notes"
          target="_blank"
          rel="noopener noreferrer"
          className="h-9 w-9 rounded-full flex items-center justify-center bg-white border border-neutral-200/80 hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition"
          title="GitHub Repository"
          aria-label="GitHub Repository"
        >
          <Github className="h-4 w-4" />
        </a>
      </div>
    </header>
  );
}
