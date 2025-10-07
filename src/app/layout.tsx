import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/contexts/WalletContext";
import { RainbowProvider } from "@/contexts/RainbowProvider";
import { ClientLoadingManager } from "@/components/ClientLoadingManager";

export const metadata: Metadata = {
  title: "Push Name Service - Universal .push Domains",
  description: "Register and manage .push domains across multiple blockchains with Push Protocol's universal technology. Trade domains seamlessly on Push Chain, Ethereum, Polygon, and more.",
  keywords: "push, push protocol, universal, domains, blockchain, ethereum, polygon, cross-chain, web3, notifications, chat",
  authors: [{ name: "Push Name Service Team" }],
  openGraph: {
    title: "Push Name Service - Universal .push Domains",
    description: "Register and manage .push domains across multiple blockchains with Push Protocol's universal technology.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Push Name Service - Universal .push Domains",
    description: "Register and manage .push domains across multiple blockchains with Push Protocol's universal technology.",
  },
  icons: {
    icon: '/icon.png',
    shortcut: '/favicon.ico',
    apple: '/icon.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body className="font-sans antialiased">
        <RainbowProvider>
          <WalletProvider>
            <ClientLoadingManager />
            {children}
          </WalletProvider>
        </RainbowProvider>
      </body>
    </html>
  );
}
