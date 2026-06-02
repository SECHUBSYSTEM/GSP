import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GSP Workflow Demo",
  description: "Global Students Pathway — workflow prototype demo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={font.className}>
        <div className="app-shell">
          <header className="site-header">
            <div className="site-header-inner">
              <div className="brand">
                <span className="brand-mark" aria-hidden="true">
                  G
                </span>
                <div>
                  <span className="brand-name">Global Students Pathway</span>
                  <span className="brand-tag">Workflow prototype</span>
                </div>
              </div>
              <span className="header-badge">Demo UI</span>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
