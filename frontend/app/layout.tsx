import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.FRONTEND_URL || "https://gdgc.swappy.lol"),
  title: "PULSE — Student Financial Intelligence",
  description:
    "Bring fragmented allowances, UPI spends, recurring commitments, and savings goals into one calm financial workspace.",
  icons: {
    icon: [{ url: "/brand/symbol.svg", type: "image/svg+xml" }, { url: "/brand/icon-32.png", sizes: "32x32" }, { url: "/brand/icon-16.png", sizes: "16x16" }],
    apple: "/brand/icon-180.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: { title: "PULSE — Your money. A clearer picture.", images: [{ url: "/brand/open-graph.png", width: 1200, height: 630 }] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
