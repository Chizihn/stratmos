"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Zap, Trophy, Swords, Users, User, Flame } from "lucide-react";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

const navigation = [
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { name: "Matches", href: "/matches", icon: Swords },
  { name: "Tournaments", href: "/tournaments", icon: Users },
  { name: "Account", href: "/account", icon: User },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-red-600 to-red-500 group-hover:shadow-[0_0_20px_rgba(255,58,58,0.4)] transition-all" />
            <Flame className="relative w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight text-foreground">
              STRATMOS
            </span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
              Battle Arena
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:gap-x-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? "text-red-400 bg-red-500/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? "text-red-400" : ""}`} />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Wallet Connect */}
        <div className="hidden lg:flex lg:items-center lg:gap-4">
          <ConnectWalletButton />
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground"
          >
            <span className="sr-only">Open main menu</span>
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border/30 bg-background/95 backdrop-blur-xl">
          <div className="space-y-1 px-6 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-semibold transition-colors ${
                    isActive
                      ? "text-red-400 bg-red-500/10"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
            <div className="pt-4 border-t border-border/30">
              <ConnectWalletButton />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
