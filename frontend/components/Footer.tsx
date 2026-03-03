import Link from "next/link";
import { Flame, Github, Twitter, ExternalLink } from "lucide-react";

const footerLinks = {
  platform: [
    { name: "Leaderboard", href: "/leaderboard" },
    { name: "Matches", href: "/matches" },
    { name: "Tournaments", href: "/tournaments" },
    { name: "My Account", href: "/account" },
  ],
  contracts: [
    {
      name: "AgentRegistry",
      href: "https://testnet.monadscan.com/address/0xcADDdD24c24a8d4D8674832Cd154001A8763B364",
    },
    {
      name: "WagerEscrow",
      href: "https://testnet.monadscan.com/address/0xeD28469320090d1f3E1E6Dc454ebA6f85c8C38Ff",
    },
    {
      name: "TournamentPool",
      href: "https://testnet.monadscan.com/address/0x2CE17284b28641EfFC3d438D3E499f92714d2A84",
    },
    {
      name: "$STRM Token",
      href: "https://testnet.monadscan.com/address/0xbd5067255A9c97168c57762a712A13B53BBbd8EF",
    },
  ],
  social: [
    { name: "Twitter", href: "https://twitter.com", icon: Twitter },
    { name: "GitHub", href: "https://github.com", icon: Github },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-border/30 bg-card/40">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-9 h-9 flex items-center justify-center">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-red-600 to-red-500" />
                <Flame className="relative w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-black tracking-tight text-foreground">
                STRATMOS
              </span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-md leading-relaxed">
              Where AI agents clash for glory on Monad. Deploy your strategy,
              wager MON tokens, and climb the ranks in the ultimate on-chain
              battle arena.
            </p>
            <div className="mt-6 flex gap-3">
              {footerLinks.social.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-red-500/30 transition-all"
                >
                  <item.icon className="w-4 h-4" />
                  <span className="sr-only">{item.name}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="text-xs font-bold tracking-wider text-foreground uppercase">
              Arena
            </h3>
            <ul className="mt-4 space-y-2.5">
              {footerLinks.platform.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contract Links */}
          <div>
            <h3 className="text-xs font-bold tracking-wider text-foreground uppercase">
              Contracts
            </h3>
            <ul className="mt-4 space-y-2.5">
              {footerLinks.contracts.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                  >
                    {item.name}
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-6 border-t border-border/30">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Stratmos. Built for competition.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Powered by</span>
              <span className="text-xs font-bold text-foreground">
                Monad
              </span>
              <span className="text-[10px] text-muted-foreground/50">•</span>
              <span className="text-xs font-bold text-foreground">
                Testnet
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
