import { FiGithub, FiLinkedin, FiMail, FiHeart, FiArrowUp } from 'react-icons/fi';

const navLinks = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'blog', label: 'Blog' },
  { id: 'contact', label: 'Contact' },
];

const socials = [
  { icon: FiGithub, href: 'https://github.com/yaqoubhassan', label: 'GitHub' },
  { icon: FiLinkedin, href: 'https://linkedin.com/in/yakubu-alhassan-ba4403125', label: 'LinkedIn' },
  { icon: FiMail, href: 'mailto:yaqoubdramani@gmail.com', label: 'Email' },
];

export default function Footer() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="border-t pt-12 sm:pt-16 pb-8 px-5 sm:px-6" style={{ borderColor: 'var(--border-primary)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Top section */}
        <div className="grid sm:grid-cols-3 gap-10 mb-12">
          {/* Brand */}
          <div>
            <button
              onClick={() => scrollTo('home')}
              className="text-2xl font-bold gradient-text cursor-pointer mb-3 block"
            >
              YA
            </button>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--text-muted)' }}>
              Senior Fullstack Developer building production-grade web, mobile, and real-time systems from Accra, Ghana.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-primary)' }}>
              Quick Links
            </h4>
            <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-2">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="text-left text-sm transition-colors cursor-pointer hover:text-primary-400"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {link.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-primary)' }}>
              Connect
            </h4>
            <div className="flex gap-3 mb-4">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg border flex items-center justify-center transition-all hover:border-primary-500/30 hover:text-primary-400"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-muted)',
                  }}
                  aria-label={social.label}
                >
                  <social.icon size={16} />
                </a>
              ))}
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              yaqoubdramani@gmail.com
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t mb-6" style={{ borderColor: 'var(--border-primary)' }} />

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm flex items-center gap-1" style={{ color: 'var(--text-faint)' }}>
            Built with <FiHeart size={12} className="text-red-500" /> by Yakubu Alhassan
          </p>

          <p className="text-xs" style={{ color: 'var(--text-dimmed)' }}>
            &copy; {new Date().getFullYear()} All rights reserved.
          </p>

          <button
            onClick={() => scrollTo('home')}
            className="group flex items-center gap-1.5 text-sm transition-colors cursor-pointer hover:text-primary-400"
            style={{ color: 'var(--text-faint)' }}
            aria-label="Back to top"
          >
            Back to top
            <FiArrowUp size={14} className="group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </footer>
  );
}
