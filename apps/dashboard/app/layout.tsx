import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trader — Fund Performance",
  description:
    "Live performance of an autonomous, multi-strategy AI trading fund. Not investment advice.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
