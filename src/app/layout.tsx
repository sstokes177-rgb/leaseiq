import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "LeaseIQ — Understand Your Lease",
  description: "Ask plain-language questions about your commercial lease and get answers grounded in your actual lease document.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} h-full antialiased dark`}>
      {/* Gradient orb blobs — purely decorative, behind all content */}
      <body className="min-h-full flex flex-col relative">
        <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
          <div style={{
            position: 'absolute', top: '-8%', left: '-6%',
            width: '520px', height: '520px',
            background: 'radial-gradient(circle, rgba(16,185,129,0.09) 0%, transparent 68%)',
            filter: 'blur(48px)',
          }} />
          <div style={{
            position: 'absolute', top: '38%', right: '-8%',
            width: '440px', height: '440px',
            background: 'radial-gradient(circle, rgba(20,184,166,0.07) 0%, transparent 68%)',
            filter: 'blur(48px)',
          }} />
          <div style={{
            position: 'absolute', bottom: '5%', left: '28%',
            width: '380px', height: '380px',
            background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 68%)',
            filter: 'blur(48px)',
          }} />
        </div>
        <div className="relative flex flex-col min-h-full" style={{ zIndex: 1 }}>
          {children}
        </div>
      </body>
    </html>
  );
}
