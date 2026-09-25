import SonarGrid from './SonarGrid';
import '../styles/contact.css';

const profiles = [
  { name: 'GitHub', href: 'https://github.com/gabriel-codes-droid' },
  { name: 'Instagram', href: 'https://www.instagram.com/jus__gabriel/?utm_source=ig_web_button_share_sheet' },
];
const technologies = ['React', 'Tailwind CSS', 'TypeScript', 'CSS', 'JavaScript', 'Java', 'C++', 'C', 'Python', 'Node.js', 'Express'];
function TechIcon({ name }) {
  if (name === 'React') return <svg viewBox="0 0 40 40" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.8">{[0, 60, 120].map(angle => <ellipse key={angle} cx="20" cy="20" rx="18" ry="7" transform={`rotate(${angle} 20 20)`}/>)}</g><circle cx="20" cy="20" r="3"/></svg>;
  if (name === 'Tailwind CSS') return <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 17c2-9 11-12 17-6 4 5 8 4 13 0-2 9-11 12-17 6-4-5-8-4-13 0M0 29c2-9 11-12 17-6 4 5 8 4 13 0-2 9-11 12-17 6-4-5-8-4-13 0"/></svg>;
  return <svg viewBox="0 0 40 40" aria-hidden="true"><rect x="2" y="2" width="36" height="36" rx="7" fill="none" stroke="currentColor"/><text x="20" y="26" textAnchor="middle" fontSize="14" fontFamily="monospace" fill="currentColor">{({ React: '⚛', 'Tailwind CSS': '≈', TypeScript: 'TS', JavaScript: 'JS', Python: 'Py', 'Node.js': 'JS', Express: 'ex' })[name] || name}</text></svg>;
}
export default function PortfolioOutro() {
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
      <nav className="contact-profiles" aria-label="Social profiles">
        <span className="contact-elsewhere">ELSEWHERE</span>
        <ul>
          {profiles.map(profile => <li key={profile.name}>
            <a href={profile.href} target="_blank" rel="noopener noreferrer" aria-label={`${profile.name} (opens in a new tab)`}>
              {profile.name}<span aria-hidden="true">↗</span>
            </a>
          </li>)}
        </ul>
      </nav>
    </section>
    <footer className="footer wrap"><div><a className="wordmark" href="#top">N.MANDRAKE GABRIEL</a><p>Built with Astro / React / Three.js / GSAP.</p></div><a href="#top">BACK TO TOP ↑</a></footer>
  </div>;
}
