import { useRef, useState } from 'react';
import SonarGrid from './SonarGrid';

// Populate with the owner's verified destinations; never invent account URLs.
export const SOCIALS = [
  { name: 'EMAIL', icon: '✉', description: 'Start a direct conversation.', action: 'SEND EMAIL', href: '' },
  { name: 'LINKEDIN', icon: 'in', description: "Connect professionally and follow what I’m building.", action: 'CONNECT', href: '' },
  { name: 'GITHUB', icon: '⌘', description: 'Explore my code, projects and technical experiments.', action: 'EXPLORE CODE', href: '' },
  { name: 'INSTAGRAM', icon: '◎', description: 'Creative work, visual experiments and ideas.', action: 'VIEW PROFILE', href: '' },
];
const technologies = ['React', 'Tailwind CSS', 'TypeScript', 'CSS', 'JavaScript', 'Java', 'C++', 'C', 'Python', 'Node.js', 'Express'];
function TechIcon({ name }) {
  if (name === 'React') return <svg viewBox="0 0 40 40" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.8">{[0, 60, 120].map(angle => <ellipse key={angle} cx="20" cy="20" rx="18" ry="7" transform={`rotate(${angle} 20 20)`}/>)}</g><circle cx="20" cy="20" r="3"/></svg>;
  if (name === 'Tailwind CSS') return <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 17c2-9 11-12 17-6 4 5 8 4 13 0-2 9-11 12-17 6-4-5-8-4-13 0M0 29c2-9 11-12 17-6 4 5 8 4 13 0-2 9-11 12-17 6-4-5-8-4-13 0"/></svg>;
  return <svg viewBox="0 0 40 40" aria-hidden="true"><rect x="2" y="2" width="36" height="36" rx="7" fill="none" stroke="currentColor"/><text x="20" y="26" textAnchor="middle" fontSize="14" fontFamily="monospace" fill="currentColor">{({ React: '⚛', 'Tailwind CSS': '≈', TypeScript: 'TS', JavaScript: 'JS', Python: 'Py', 'Node.js': 'JS', Express: 'ex' })[name] || name}</text></svg>;
}
function SocialIcon({ name }) {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    {name === 'EMAIL' && <><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m3 6 9 7 9-7"/></>}
    {name === 'LINKEDIN' && <><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 10v8m5 0v-8m0 4c0-5 6-5 6 0v4"/><circle cx="7" cy="7" r=".8" fill="currentColor"/></>}
    {name === 'INSTAGRAM' && <><rect x="2" y="2" width="20" height="20" rx="6"/><circle cx="12" cy="12" r="4.5"/><circle cx="18" cy="6" r="1" fill="currentColor"/></>}
    {name === 'GITHUB' && <><path d="M9 21v-4c-4 1-6-2-6-2m12 6v-4c4-1 6-3 6-7 0-2-1-3-2-4 0-1 0-3-1-4-2 0-4 2-4 2h-4S8 2 6 2C5 3 5 5 5 6c-1 1-2 2-2 4 0 4 2 6 6 7"/></>}
  </svg>;
}
export default function PortfolioOutro() {
  const [active, setActive] = useState(0);
  const start = useRef(0);
  const next = (direction) => setActive(value => (value + direction + SOCIALS.length) % SOCIALS.length);
  return <div className="editorial lower-content">
    <SonarGrid background />
    <section aria-labelledby="tech-heading"><div className="wrap"><p className="eyebrow">04 / TECH STACK</p><h2 id="tech-heading">TOOLS I BUILD WITH.</h2></div>
      <div className="tech-marquee"><div className="tech-track">{[0, 1].map(copy => <div key={copy} aria-hidden={copy === 1}>{technologies.map(name => <span key={name}><TechIcon name={name}/>{name}</span>)}</div>)}</div></div>
    </section>
    <section className="contact-section wrap" id="contact"><p className="eyebrow">05 / LET’S TALK</p><h2>OPEN A CHANNEL.</h2><p>Have an idea, opportunity, or something worth building?</p>
      <div className="social-stage" role="region" aria-label="Social cards" tabIndex={0} onKeyDown={event => { if (event.key === 'ArrowRight') { event.preventDefault(); next(1); } if (event.key === 'ArrowLeft') { event.preventDefault(); next(-1); } }} onTouchStart={event => { start.current = event.touches[0].clientX; }} onTouchEnd={event => { const travel = event.changedTouches[0].clientX - start.current; if (Math.abs(travel) > 45) next(travel < 0 ? 1 : -1); }}>
        {SOCIALS.map((social, index) => { let offset = (index - active + 4) % 4; if (offset > 2) offset -= 4; const selected = offset === 0; return <article key={social.name} className="social-card" style={{ zIndex: 10 - Math.abs(offset), opacity: selected ? 1 : .48, transform: `translateX(${offset * 57}%) translateZ(${-Math.abs(offset) * 100}px) rotateY(${-offset * 12}deg) rotateZ(${offset * 4}deg) scale(${selected ? 1.02 : .88})` }} onClick={() => setActive(index)}>
          <button type="button" aria-label={`Select ${social.name}`} aria-pressed={selected} onClick={() => setActive(index)} style={{ background: 'none', border: 0, color: 'inherit', fontSize: 25 }}><SocialIcon name={social.name}/></button><h3>{social.name}</h3><p>{social.description}</p>{selected && (social.href ? <a href={social.href} target="_blank" rel="noopener noreferrer">{social.action} ↗</a> : <span className="missing-link">PROFILE LINK COMING SOON</span>)}
        </article>; })}
      </div><div className="deck-controls"><button onClick={() => next(-1)} aria-label="Previous social card">←</button><button onClick={() => next(1)} aria-label="Next social card">→</button></div>
    </section>
    <footer className="footer wrap"><div><a className="wordmark" href="#top">MANDRAKE GABRIEL</a><p>Built with Astro / React / Three.js / GSAP.</p></div><a href="#top">BACK TO TOP ↑</a></footer>
  </div>;
}
