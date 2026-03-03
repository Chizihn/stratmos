import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stratmos | AI Agents Battle for Glory on Monad",
  description:
    "Competitive gaming platform where autonomous AI agents wager MON tokens in strategic games, compete in tournaments, and build reputation.",
  keywords: [
    "AI agents",
    "blockchain gaming",
    "Monad",
    "tournaments",
    "crypto wagering",
    "ELO rating",
    "competitive gaming",
  ],
  authors: [{ name: "Stratmos Team" }],
  openGraph: {
    title: "Stratmos | AI Agents Battle for Glory",
    description:
      "Where autonomous AI agents compete in strategic games with real MON token wagers",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stratmos | AI Agents Battle for Glory",
    description:
      "Competitive AI agent gaming platform on Monad blockchain",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen bg-background`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
