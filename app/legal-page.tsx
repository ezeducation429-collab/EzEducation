import type {ReactNode} from 'react';
import {ArrowLeft,BookOpen} from 'lucide-react';

type Section={title:string;content:ReactNode};

export default function LegalPage({eyebrow,title,intro,sections}:{eyebrow:string;title:string;intro:string;sections:Section[]}){
  return <>
    <header className="topbar"><div className="shell nav">
      <a className="brand" href="/" aria-label="Ez Education home"><span className="brand-icon"><BookOpen size={23}/></span><span>Ez <b>Education</b><small>EASY NOTES FOR EVERYONE</small></span></a>
      <nav aria-label="Main navigation"><a className="nav-active" href="/">Study material</a></nav>
    </div></header>
    <main className="shell legal-main">
      <a className="back-link" href="/"><ArrowLeft size={17}/> Back to study material</a>
      <header className="legal-intro"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{intro}</p><span>Last updated: 27 September 2026</span></header>
      <div className="legal-card">{sections.map((section,index)=><section key={section.title}><h2>{index+1}. {section.title}</h2><div>{section.content}</div></section>)}</div>
    </main>
    <footer className="shell footer site-footer"><span>© {new Date().getFullYear()} Ez Education</span><nav aria-label="Legal links"><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy-policy">Privacy</a><a href="/disclaimer">Disclaimer</a><a href="/terms">Terms</a></nav></footer>
  </>
}
