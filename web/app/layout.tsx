import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';


const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const googleAnalyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

export const metadata: Metadata = {
  metadataBase: new URL("https://www.aiendpoint.dev"),
  title: "AIEndpoint — The /ai Standard",
  description: "Search and discover AI-ready services. Register your service and get the AI-Ready badge.",
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <Navbar />
        <main>{children}</main>
        <footer className="border-t border-line mt-20 py-8 px-6 text-center text-muted text-sm">
          <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-6">
            <a href="https://github.com/aiendpoint/platform" className="hover:text-fg transition-colors">GitHub</a>
            <a href="https://datatracker.ietf.org/doc/draft-aiendpoint-ai-discovery/" target="_blank" rel="noopener noreferrer" className="hover:text-fg transition-colors">Internet-Draft</a>
            <a href="/docs/spec" className="hover:text-fg transition-colors">Spec</a>
            <a href="/docs" className="hover:text-fg transition-colors">Docs</a>
            <a href="/validate" className="hover:text-fg transition-colors">Validator</a>
            <a href="https://github.com/aiendpoint/platform/discussions" className="hover:text-fg transition-colors">Discussions</a>
            <a href="mailto:contact@aiendpoint.dev" className="hover:text-fg transition-colors">Contact</a>
          </div>
          <p className="mt-4 text-xs text-subtle">AIEndpoint Spec v1.0 — Apache 2.0</p>
        </footer>
        <SpeedInsights />
        <Analytics />
      </body>
      {googleAnalyticsId ? <GoogleAnalytics gaId={googleAnalyticsId} /> : null}
    </html>
  );
}
