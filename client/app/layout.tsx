import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GSP Workflow Demo',
  description: 'Global Students Pathway — workflow prototype demo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
