import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GeM Bid Compliance Verification Platform — Decision Support System",
  description:
    "Deterministic procurement compliance verification and evidence-based decision support.",
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
