import { motion } from 'framer-motion';
import { FiGithub, FiLinkedin, FiMail, FiDownload } from 'react-icons/fi';
import { useTheme } from '../hooks/useTheme';

export default function Hero() {
  const { theme } = useTheme();

  return (
    <section
      id="home"
      className="relative min-h-[100svh] flex items-center justify-center overflow-hidden pt-20 pb-24 sm:pt-0 sm:pb-0"
      aria-label="Introduction"
    >
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[100px] animate-pulse ${theme === 'dark' ? 'bg-primary-600/20' : 'bg-primary-400/15'}`} />
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-[100px] animate-pulse [animation-delay:2s] ${theme === 'dark' ? 'bg-accent-500/15' : 'bg-accent-500/10'}`} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[120px] animate-pulse [animation-delay:4s] ${theme === 'dark' ? 'bg-primary-500/10' : 'bg-primary-400/8'}`} />
      </div>

      {/* Grid pattern overlay */}
      <div
        className={`absolute inset-0 ${theme === 'dark' ? 'opacity-[0.03]' : 'opacity-[0.04]'}`}
        style={{
          backgroundImage: theme === 'dark'
            ? 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)'
            : 'linear-gradient(rgba(0,0,0,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.06) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-5 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', bounce: 0.4 }}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary-600/10 border border-primary-500/20 text-primary-400 text-xs sm:text-sm font-medium mb-6 sm:mb-8"
          >
            <span className="w-2 h-2 bg-accent-500 rounded-full animate-pulse" />
            Available for opportunities
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-4 sm:mb-6"
          style={{ color: 'var(--text-primary)' }}
        >
          Hi, I'm{' '}
          <span className="gradient-text">Yakubu</span>
          <br />
          <span style={{ color: 'var(--text-secondary)' }}>Alhassan</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          Senior Fullstack Developer with 8+ years of experience building
          production-grade web, mobile, and real-time systems. Currently
          architecting the{' '}
          <span className="text-primary-400">XChargeEV</span> platform.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12"
        >
          <a
            href="#contact"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="group inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 bg-primary-600 hover:bg-primary-500 text-white rounded-full text-sm sm:text-base font-medium transition-all duration-300 shadow-lg shadow-primary-600/25 hover:shadow-primary-500/40 hover:-translate-y-0.5"
          >
            Get In Touch
            <FiMail className="group-hover:rotate-12 transition-transform" />
          </a>
          <a
            href="/Yakubu_Alhassan_CV.pdf"
            download
            className="group inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-full text-sm sm:text-base font-medium transition-all duration-300 hover:-translate-y-0.5 border"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)',
            }}
          >
            Download CV
            <FiDownload className="group-hover:translate-y-0.5 transition-transform" />
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex items-center justify-center gap-3 sm:gap-4"
        >
          {[
            { icon: FiGithub, href: 'https://github.com/yaqoubhassan', label: 'GitHub' },
            { icon: FiLinkedin, href: 'https://linkedin.com/in/yakubu-alhassan-ba4403125', label: 'LinkedIn' },
            { icon: FiMail, href: 'mailto:yaqoubdramani@gmail.com', label: 'Email' },
          ].map((social) => (
            <motion.a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="p-2.5 sm:p-3 rounded-full border transition-colors hover:border-primary-500/50 hover:bg-primary-600/10"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-muted)',
              }}
              aria-label={social.label}
            >
              <social.icon size={18} />
            </motion.a>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator — hidden on mobile, visible on sm+ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-10 hidden sm:block"
        aria-hidden="true"
      >
        <div
          className="w-6 h-10 rounded-full flex justify-center pt-2 border-2"
          style={{ borderColor: 'var(--text-dimmed)' }}
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            className="w-1.5 h-1.5 bg-primary-400 rounded-full"
          />
        </div>
      </motion.div>
    </section>
  );
}
