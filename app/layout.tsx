import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "SBNutrition",
  description: "Track what you eat at Stony Brook University dining locations.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#990000" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Nav />
          <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-5xl px-4 pb-20 text-xs text-stone-500 sm:pb-8">
            Menu and nutrition data from Stony Brook Dining via Nutrislice, refreshed daily. Values are estimates;
            check with dining staff about allergens.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
