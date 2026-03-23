import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexusFlow — Smart Inventory & Supply Chain Platform",
  description:
    "AI-driven, real-time multi-tenant SaaS platform for inventory management, predictive supply chain analytics, automated procurement, and warehouse operations.",
  keywords: [
    "inventory management",
    "supply chain",
    "SaaS",
    "warehouse management",
    "procurement",
    "AI forecasting",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="noise-bg grid-pattern" style={{ fontFamily: "'Inter', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
