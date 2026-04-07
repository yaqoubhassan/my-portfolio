import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const stats = [
  { value: '8+', label: 'Years Experience' },
  { value: '18+', label: 'Charging Stations Powered' },
  { value: '12+', label: 'Microservices Integrated' },
  { value: '5', label: 'Codebases Maintained Solo' },
];

export default function Stats() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <section className="relative py-10 sm:py-16 px-5 sm:px-6" aria-label="Key metrics">
      <div
        className="max-w-5xl mx-auto rounded-2xl border p-6 sm:p-8 md:p-10"
        ref={ref}
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl sm:text-4xl font-bold gradient-text mb-1">
                {stat.value}
              </div>
              <p className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
