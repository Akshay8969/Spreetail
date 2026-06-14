import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlatSplit — Shared Expenses for The Flat",
  description: "Track, split, and settle shared expenses with your flat-mates. Clean balances, full audit trail.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
