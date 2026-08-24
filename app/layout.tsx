import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ASR Groups — Internal Finance ERP",
  description: "Enterprise Financial Management, Multi-Role Administration & Loan Underwriting System",
  icons: {
    icon: "/Groups Finalized.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#F8F6F1] text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
