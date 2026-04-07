import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiMenuAlt3, HiX } from 'react-icons/hi';
import { FiSun, FiMoon } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import { useScrollspy } from '../hooks/useScrollspy';
import { useTheme } from '../hooks/useTheme';

const navLinks = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'blog', label: 'Blog' },
  { id: 'contact', label: 'Contact' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const activeId = useScrollspy(navLinks.map((l) => l.id), 150);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = (id: string) => {
    setIsOpen(false);
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: id } });
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'backdrop-blur-xl border-b shadow-lg'
          : 'bg-transparent'
      }`}
      style={scrolled ? {
        backgroundColor: 'var(--nav-bg)',
        borderColor: 'var(--border-primary)',
        boxShadow: `0 10px 15px -3px var(--shadow-color)`,
      } : undefined}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <motion.a
          href="#home"
          onClick={(e) => { e.preventDefault(); handleClick('home'); }}
          className="text-2xl font-bold gradient-text"
          whileHover={{ scale: 1.05 }}
          aria-label="Go to home section"
        >
          YA
        </motion.a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleClick(link.id)}
              className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors cursor-pointer ${
                activeId === link.id
                  ? 'text-themed'
                  : 'text-themed-muted hover:text-themed'
              }`}
              style={activeId !== link.id ? { color: undefined } : undefined}
              aria-current={activeId === link.id ? 'true' : undefined}
            >
              {activeId === link.id && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-primary-600/20 border border-primary-500/30 rounded-full"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{link.label}</span>
            </button>
          ))}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="ml-2 p-2 rounded-full transition-colors cursor-pointer hover:bg-primary-600/10"
            style={{ color: 'var(--text-muted)' }}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>
        </div>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-2xl cursor-pointer"
            style={{ color: 'var(--text-primary)' }}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
          >
            {isOpen ? <HiX /> : <HiMenuAlt3 />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden backdrop-blur-xl border-b"
            style={{
              backgroundColor: 'var(--nav-bg)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <div className="px-6 py-4 flex flex-col gap-2">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => handleClick(link.id)}
                  className={`text-left px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                    activeId === link.id
                      ? 'bg-primary-600/20'
                      : 'hover:bg-primary-600/5'
                  }`}
                  style={{
                    color: activeId === link.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
