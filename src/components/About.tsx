import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { FiCode, FiSmartphone, FiZap, FiUsers } from 'react-icons/fi';

const highlights = [
  {
    icon: FiCode,
    title: 'Full-Stack Architecture',
    desc: 'Laravel, React, Vue, Nuxt, Next.js — end-to-end system design',
  },
  {
    icon: FiZap,
    title: 'Real-Time Systems',
    desc: 'WebSocket protocols, OCPP 1.6, live charger communication',
  },
  {
    icon: FiSmartphone,
    title: 'Cross-Platform Apps',
    desc: 'Ionic, React Native, Flutter — native mobile experiences',
  },
  {
    icon: FiUsers,
    title: 'Team Leadership',
    desc: 'Agile ceremonies, sprint planning, code reviews, mentorship',
  },
];

export default function About() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="about" className="relative py-32 px-6" aria-label="About me">
      <div className="max-w-6xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-primary-400 text-sm font-mono font-medium tracking-wider uppercase">
            About Me
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold mt-4" style={{ color: 'var(--text-primary)' }}>
            Turning Ideas Into{' '}
            <span className="gradient-text">Digital Reality</span>
          </h2>
        </motion.div>

        {/* Photo + Bio */}
        <div className="grid md:grid-cols-5 gap-12 items-center mb-16">
          {/* Profile photo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="md:col-span-2 flex justify-center"
          >
            <div className="relative">
              <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden border-2 border-primary-500/20 shadow-xl shadow-primary-600/10">
                <img
                  src="/profile.jpg"
                  alt="Yakubu Alhassan"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              {/* Decorative accent */}
              <div className="absolute -z-10 -bottom-3 -right-3 w-64 h-64 sm:w-72 sm:h-72 rounded-2xl border-2 border-primary-500/10" />
            </div>
          </motion.div>

          {/* Bio text */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="md:col-span-3"
          >
            <p className="leading-relaxed text-lg mb-6" style={{ color: 'var(--text-muted)' }}>
              I'm a Senior Fullstack Developer based in Accra, Ghana, with over
              8 years of experience crafting production-grade web, mobile, and
              real-time systems. I thrive on solving complex technical challenges
              and shipping products that make a real impact.
            </p>
            <p className="leading-relaxed text-lg mb-6" style={{ color: 'var(--text-muted)' }}>
              Currently, I serve as the sole developer at{' '}
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>DriveEV Ghana</span>,
              where I single-handedly maintain and enhance the entire XChargeEV
              electric vehicle charging platform — spanning a Laravel API, Nuxt.js
              admin dashboard, Ionic Vue mobile app, PWA, and a custom OCPP 1.6
              WebSocket server.
            </p>
            <p className="leading-relaxed text-lg" style={{ color: 'var(--text-muted)' }}>
              I also lead a team at{' '}
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Dexwin Tech</span>,
              building the MTN Self-Service Portal for MTN Ghana's customer base
              using React 19, TypeScript, and modern cloud tooling.
            </p>
          </motion.div>
        </div>

        {/* Highlight cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {highlights.map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.5 + idx * 0.1 }}
              className="group p-5 rounded-2xl border hover:border-primary-500/30 hover:bg-primary-600/5 transition-all duration-300"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-primary)',
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-primary-600/10 flex items-center justify-center mb-3 group-hover:bg-primary-600/20 transition-colors">
                <item.icon className="text-primary-400" size={20} />
              </div>
              <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                {item.title}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-faint)' }}>
                {item.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
