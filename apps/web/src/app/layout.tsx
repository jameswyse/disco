import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  description: "Browse, filter and request movies and TV shows through Seerr.",
  title: {
    default: "Disco",
    template: "%s · Disco",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

type RootLayoutProperties = Readonly<{ children: ReactNode }>;

export default function RootLayout({ children }: RootLayoutProperties) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
