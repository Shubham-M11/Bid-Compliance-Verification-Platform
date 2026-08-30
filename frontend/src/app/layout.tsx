import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GeM Bid Compliance Verification Platform | SIH 2026",
  description:
    "AI-Powered Integrated Bid Compliance Verification Platform for GeM Procurement (SIH 2026 Problem Statement SIH26100)",
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
