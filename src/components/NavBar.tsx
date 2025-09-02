"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";
import HoverUp from "./animations/HoverText";

const Navbar = () => {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Agents" },
    { href: "/rag", label: "RAG" },
    { href: "/agenticFlow", label: "Agentic-Flow" },
    { href: "/agent-builder", label: "Agent-Builder" },
    // { href: "/contact", label: "Contact" },
    // { href: "/ocr", label: "OCR" },
    // { href: "/spline", label: "Spline" },
    // { href: "/shadcn", label: "ShadCN" },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  return (
    <nav className="bg-background shadow-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "inline-flex items-center px-1 pt-1 text-sm font-medium",
                    isActive(link.href)
                      ? "text-foreground"
                      : "text-foreground/30 hover:text-foreground/50 border-transparent",
                  )}
                >
                  <HoverUp text={link.label} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
