import type { Metadata } from "next";
import { Ubuntu } from "next/font/google";
import "./globals.css";

const ubuntu = Ubuntu({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-ubuntu",
  display: "swap",
});

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
    <html lang="en" className={`h-full antialiased ${ubuntu.variable}`}>
      <body className="min-h-full flex flex-col bg-[#F8F6F1] text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
