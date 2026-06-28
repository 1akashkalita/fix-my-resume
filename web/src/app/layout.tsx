import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Archivo, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/ui/ThemeProvider";
import { SettingsProvider } from "@/ui/SettingsProvider";

const serif = Instrument_Serif({ weight: ["400"], subsets: ["latin"], variable: "--font-instrument-serif", display: "swap" });
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap" });

const DESCRIPTION =
  "Upload a resume PDF and get an explainable, fairness-constrained score, a plain-language coach, and trend tracking over time — running entirely in your browser. Your resume and API key never leave your device.";

export const metadata: Metadata = {
  metadataBase: new URL("https://fixmyresume.dev"),
  title: { default: "Fix My Resume", template: "%s · Fix My Resume" },
  description: DESCRIPTION,
  applicationName: "Fix My Resume",
  openGraph: {
    type: "website",
    url: "https://fixmyresume.dev",
    siteName: "Fix My Resume",
    title: "Fix My Resume — an honest, in-browser resume score",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Fix My Resume — an honest, in-browser resume score",
    description:
      "An explainable resume score with a plain-language coach and trend tracking. Runs entirely in your browser — nothing is uploaded.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E7EAEE" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1320" },
  ],
};

// Set the theme before paint so there's no flash. First visit (no stored
// preference) follows the OS prefers-color-scheme; an explicit toggle always wins.
const themeBootstrap = `(function(){try{var t=localStorage.getItem('ha-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}else{var d=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.setAttribute('data-theme',d?'dark':'light');}}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${serif.variable} ${archivo.variable} ${mono.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body>
        <ThemeProvider>
          <SettingsProvider>{children}</SettingsProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
