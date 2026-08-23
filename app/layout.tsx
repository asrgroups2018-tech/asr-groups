import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASR Groups — Finance ERP",
  description:
    "Enterprise loan management & financial intelligence platform for ASR Family Finance.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
