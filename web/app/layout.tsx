import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const googleAnalyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

export const metadata: Metadata = {
  title: "AIEndpoint — The /ai Standard",
  description: "Search and discover AI-ready services. Register your service and get the AI-Ready badge.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <Navbar />
        <main>{children}</main>
        <footer className="border-t border-[#222] mt-20 py-8 px-6 text-center text-[#888] text-sm">
          <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-6">
            <a href="https://github.com/aiendpoint/platform" className="hover:text-[#e5e5e5] transition-colors">GitHub</a>
            <a href="/docs" className="hover:text-[#e5e5e5] transition-colors">Spec</a>
            <a href="/docs" className="hover:text-[#e5e5e5] transition-colors">Docs</a>
            <a href="/validate" className="hover:text-[#e5e5e5] transition-colors">Validator</a>
          </div>
          <p className="mt-4 text-xs text-[#555]">AIEndpoint Spec v1.0 — Apache 2.0</p>
        </footer>
      </body>
      {googleAnalyticsId ? <GoogleAnalytics gaId={googleAnalyticsId} /> : null}
    </html>
  );
}
