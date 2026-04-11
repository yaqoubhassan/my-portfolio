import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiBookOpen } from 'react-icons/fi';

export default function FeaturedArticle() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <section className="relative py-10 sm:py-16 px-5 sm:px-6" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <Link
            to="/blog/building-ocpp-websocket-server"
            className="group relative block rounded-2xl overflow-hidden border transition-all duration-500 hover:border-primary-500/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary-600/10"
            style={{
              borderColor: 'var(--border-primary)',
              background: 'linear-gradient(135deg, var(--bg-card), var(--bg-subtle))',
            }}
          >
            {/* Decorative gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-primary-400 to-accent-500" />

            <div className="p-6 sm:p-8 md:p-10 flex flex-col sm:flex-row gap-6 sm:items-center">
              {/* Icon */}
              <div className="shrink-0 w-14 h-14 rounded-2xl bg-primary-600/10 flex items-center justify-center group-hover:bg-primary-600/20 transition-colors">
                <FiBookOpen size={24} className="text-primary-400" />
              </div>

              {/* Content */}
              <div className="grow">
                <p className="text-xs font-mono uppercase tracking-wider text-primary-400 mb-2">
                  Featured Article
                </p>
                <h3
                  className="text-lg sm:text-xl font-bold mb-2 group-hover:text-primary-400 transition-colors leading-snug"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Building a Custom OCPP 1.6 WebSocket Server — And the 9 Bugs That Nearly Broke It
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  How we built an EV charging backend in PHP, and the cascade of subtle bugs we uncovered when real chargers met real drivers. Race conditions, phantom sessions, and billing errors — all in production.
                </p>
              </div>

              {/* Arrow */}
              <div className="shrink-0 hidden sm:flex items-center">
                <span className="w-10 h-10 rounded-full bg-primary-600/10 flex items-center justify-center text-primary-400 group-hover:bg-primary-600/20 group-hover:translate-x-1 transition-all">
                  <FiArrowRight size={18} />
                </span>
              </div>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
