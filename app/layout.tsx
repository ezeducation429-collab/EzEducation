import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
export const metadata:Metadata={metadataBase:new URL('https://ezeducation.in'),title:{default:'Ez Education | B.Pharm & D.Pharm Study Material',template:'%s'},description:'Find B.Pharm semester-wise and D.Pharm year-wise notes and study material. Ez Education – Easy Notes for Everyone.',alternates:{canonical:'/'},icons:{icon:'/favicon.svg',shortcut:'/favicon.svg'},other:{'google-adsense-account':'ca-pub-7836159384167213'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><head><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7836159384167213" crossOrigin="anonymous"/></head><body><nav aria-label="Student account" style={{background:"#122449",color:"white",padding:"10px 5%",display:"flex",justifyContent:"space-between",gap:16,fontSize:14}}><a href="/">Ez Education</a><a href="/account">Student login / My purchases →</a></nav>{children}<Script async src="https://www.googletagmanager.com/gtag/js?id=G-SCLPMEV2BY" strategy="afterInteractive"/><Script id="google-analytics" strategy="afterInteractive">{`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-SCLPMEV2BY');`}</Script></body></html>}
