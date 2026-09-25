import { useState } from 'react';
import SonarGrid from './SonarGrid';
import '../styles/contact.css';

const profiles = [
  { index: '01', name: 'EMAIL', label: 'DIRECT LINE', description: 'Start a conversation about a project or opportunity.', action: 'SEND EMAIL', href: 'mailto:nmandrakegabriel@gmail.com', external: false },
  { index: '02', name: 'GITHUB', label: 'CODE / SYSTEMS', description: 'Explore the code, experiments, and products behind the work.', action: 'OPEN GITHUB', href: 'https://github.com/gabriel-codes-droid', external: true },
  { index: '03', name: 'INSTAGRAM', label: 'VISUAL NOTES', description: 'Follow the visual experiments and ideas outside the portfolio.', action: 'OPEN INSTAGRAM', href: 'https://www.instagram.com/jus__gabriel/?utm_source=ig_web_button_share_sheet', external: true },
];
const technologies = ['React', 'Tailwind CSS', 'TypeScript', 'CSS', 'JavaScript', 'Java', 'C++', 'C', 'Python', 'Node.js', 'Express'];
function TechIcon({ name }) {
  if (name === 'React') return <svg viewBox="0 0 40 40" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.8">{[0, 60, 120].map(angle => <ellipse key={angle} cx="20" cy="20" rx="18" ry="7" transform={`rotate(${angle} 20 20)`}/>)}</g><circle cx="20" cy="20" r="3"/></svg>;
  if (name === 'Tailwind CSS') return <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 17c2-9 11-12 17-6 4 5 8 4 13 0-2 9-11 12-17 6-4-5-8-4-13 0M0 29c2-9 11-12 17-6 4 5 8 4 13 0-2 9-11 12-17 6-4-5-8-4-13 0"/></svg>;
  return <svg viewBox="0 0 40 40" aria-hidden="true"><rect x="2" y="2" width="36" height="36" rx="7" fill="none" stroke="currentColor"/><text x="20" y="26" textAnchor="middle" fontSize="14" fontFamily="monospace" fill="currentColor">{({ React: '⚛', 'Tailwind CSS': '≈', TypeScript: 'TS', JavaScript: 'JS', Python: 'Py', 'Node.js': 'JS', Express: 'ex' })[name] || name}</text></svg>;
}
export default function PortfolioOutro() {
  const [activeProfile, setActiveProfile] = useState(0);
  const moveProfile = (direction) => setActiveProfile(current => (current + direction + profiles.length) % profiles.length);

  return <div className="editorial lower-content">
    <SonarGrid background />
    <section aria-labelledby="tech-heading"><div className="wrap"><p className="eyebrow">04 / TECH STACK</p><h2 id="tech-heading">TOOLS I BUILD WITH.</h2></div>
      <div className="tech-marquee"><div className="tech-track">{[0, 1].map(copy => <div key={copy} aria-hidden={copy === 1}>{technologies.map(name => <span key={name}><TechIcon name={name}/>{name}</span>)}</div>)}</div></div>
    </section>
    <section className="contact-section wrap" id="contact" aria-labelledby="contact-heading">
      <p className="eyebrow">05 / LET’S TALK</p>
      <h2 id="contact-heading">LET’S BUILD<br/>SOMETHING.</h2>
      <p className="contact-intro">Have a project in mind? Let’s talk about it.</p>
      <a className="contact-email" href="mailto:nmandrakegabriel@gmail.com">
        <span>nmandrakegabriel<wbr/>@gmail.com</span>
        <span className="contact-arrow" aria-hidden="true">↗</span>
      </a>
      <div
        className="contact-card-stack"
        role="region"
        aria-label="Contact links"
        tabIndex="0"
        onKeyDown={event => {
          if (event.key === 'ArrowLeft') { event.preventDefault(); moveProfile(-1); }
          if (event.key === 'ArrowRight') { event.preventDefault(); moveProfile(1); }
        }}
      >
        <div className="contact-card-stage">
          {profiles.map((profile, index) => {
            let offset = (index - activeProfile + profiles.length) % profiles.length;
            if (offset > Math.floor(profiles.length / 2)) offset -= profiles.length;
            const active = offset === 0;
            const distance = Math.abs(offset);
            return <a
              key={profile.name}
              className={`contact-card${active ? ' is-active' : ''}`}
              href={profile.href}
              target={profile.external ? '_blank' : undefined}
              rel={profile.external ? 'noopener noreferrer' : undefined}
              onMouseEnter={() => setActiveProfile(index)}
              onFocus={() => setActiveProfile(index)}
              aria-label={`${profile.action}${profile.external ? ' (opens in a new tab)' : ''}`}
              aria-current={active ? 'true' : undefined}
              style={{
                zIndex: 10 - distance,
                '--card-x': `${offset * 42}%`,
                '--card-y': `${distance * 12}px`,
                '--card-z': `${-distance * 92}px`,
                '--card-rotate': `${offset * 7}deg`,
                '--card-scale': active ? '1' : '.9',
                '--card-opacity': active ? '1' : '.54',
              }}
            >
              <span className="contact-card-top"><span>{profile.index}</span><span aria-hidden="true">↗</span></span>
              <span className="contact-card-label">{profile.label}</span>
              <strong>{profile.name}</strong>
              <span className="contact-card-description">{profile.description}</span>
              <span className="contact-card-action">{profile.action}</span>
            </a>;
          })}
        </div>
        <div className="contact-card-controls" aria-label="Contact card navigation">
          <button type="button" onClick={() => moveProfile(-1)} aria-label="Previous contact card">←</button>
          <div className="contact-card-dots">
            {profiles.map((profile, index) => <button
              key={profile.name}
              type="button"
              className={index === activeProfile ? 'is-active' : ''}
              onClick={() => setActiveProfile(index)}
              aria-label={`Show ${profile.name}`}
              aria-pressed={index === activeProfile}
            />)}
          </div>
          <button type="button" onClick={() => moveProfile(1)} aria-label="Next contact card">→</button>
        </div>
      </div>
    </section>
    <footer className="footer wrap"><div><a className="wordmark" href="#top">N.MANDRAKE GABRIEL</a><p>Built with Astro / React / Three.js / GSAP.</p></div><a href="#top">BACK TO TOP ↑</a></footer>
  </div>;
}
