import type { Metadata } from 'next';
import Script from 'next/script';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://ezeducation.in'),
  title: {
    default: 'Ez Education | B.Pharm & D.Pharm Study Material & Quizzes',
    template: '%s | Ez Education',
  },
  description:
    'Find B.Pharm semester-wise and D.Pharm year-wise notes, question papers, syllabus, student quizzes, and Python programming labs. Ez Education – Easy Notes for Everyone.',
  alternates: { canonical: '/' },
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
  other: { 'google-adsense-account': 'ca-pub-7836159384167213' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7836159384167213"
          crossOrigin="anonymous"
        />
      </head>
      <body className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
        <Navbar />
        <div className="flex-1">{children}</div>
        <Footer />

        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-SCLPMEV2BY"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-SCLPMEV2BY');`}
        </Script>
      </body>
    </html>
  );
}
