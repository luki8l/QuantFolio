import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google"; // eslint-disable-line @typescript-eslint/no-unused-vars
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuantFolio",
  description: "Advanced Quantitative Finance Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-background text-foreground`}
      >
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
