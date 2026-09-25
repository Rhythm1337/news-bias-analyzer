import type { Metadata } from "next";
import { Playfair_Display, Newsreader, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Prism · News Bias Analyzer",
  description:
    "Analyze any news article for political bias, emotional tone, factual reliability, and fake-news likelihood.",
};

// Run before paint to avoid a flash of the wrong theme.
const themeBootstrap = `
(function(){try{
  var m = localStorage.getItem('nba-theme');
  if (m !== 'light' && m !== 'dark') m = 'light';
  document.documentElement.setAttribute('data-mode', m);
}catch(e){
  document.documentElement.setAttribute('data-mode', 'light');
}})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-mode="light"
      suppressHydrationWarning
      className={`${playfair.variable} ${newsreader.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
