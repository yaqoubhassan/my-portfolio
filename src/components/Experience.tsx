import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const experiences = [
  {
    company: 'DriveEV Ghana',
    role: 'Senior Fullstack Developer',
    period: 'Nov 2025 – Present',
    location: 'Accra, Ghana',
    highlights: [
      'Sole ownership of the entire XChargeEV platform — Laravel 11 API, Nuxt 3 web admin, Ionic Vue mobile app, PWA, and OCPP 1.6 WebSocket server.',
      'Resolved critical revenue-impacting bugs: OCPP race conditions and negative wallet balance exploits, recovering significant recurring revenue.',
      'Designed a comprehensive fleet management system spanning 6 epics — driver groups, spending limits, vehicle custodianship, VIN-based charging, and fleet dashboards.',
      'Engineered multi-channel notifications: FCM v1, SMS (ECS & Nalo), WhatsApp Cloud API, email, and in-app alerts.',
      'Integrated Paystack payment reconciliation with mobile money support (MTN, Vodafone, AirtelTigo).',
    ],
    tech: ['Laravel 11', 'Nuxt 3', 'Ionic Vue', 'OCPP 1.6', 'Paystack', 'FCM', 'WhatsApp API'],
  },
  {
    company: 'Dexwin Tech Limited',
    role: 'Software Engineer (Team Lead)',
    period: 'Mar 2025 – Present',
    location: 'Accra, Ghana',
    highlights: [
      'Built the MTN Self-Service Portal (SSP) frontend from scratch using React 19 and TypeScript — successfully launched for MTN Ghana.',
      'Engineered API integration layer connecting 12+ backend microservices with retry logic and exponential backoff.',
      'Implemented Auth0 authentication with OAuth 2.0, secure session management, and role-based routing.',
      'Integrated OpenTelemetry SDK for distributed tracing, metrics, and end-to-end observability.',
      'Led agile ceremonies: daily standups, bi-weekly sprint planning, and sprint reviews.',
    ],
    tech: ['React 19', 'TypeScript', 'Tailwind CSS 4', 'Auth0', 'OpenTelemetry', 'Azure DevOps', 'Docker'],
  },
  {
    company: 'Bridge Labs',
    role: 'Software Engineer / Technical Lead',
    period: 'Apr 2023 – Feb 2025',
    location: 'Remote - USA',
    highlights: [
      'Architected a full-stack job board with Laravel 10, Vue.js, and Inertia.js. Integrated Stripe and OpenAI API.',
      'Led a cross-functional team to build a trip planning app using Laravel 9 and Next.js with SSR.',
      'Designed database schemas resulting in 35% faster data retrieval. Integrated Stripe reducing checkout abandonment by 20%.',
    ],
    tech: ['Laravel', 'Vue.js', 'Next.js', 'Inertia.js', 'Stripe', 'OpenAI', 'MySQL'],
  },
  {
    company: 'Walulel',
    role: 'Technical Lead / Backend Developer',
    period: 'Feb 2018 – Jan 2023',
    location: 'Accra, Ghana',
    highlights: [
      'Led technical direction for the property valuation platform — Laravel backend API and React.js frontend.',
      'Architected high-performance RESTful APIs using Laravel 8 and Node.js/Express microservices with SOLID principles.',
      'Achieved 90% test coverage with TDD (PHPUnit). Implemented PostGIS for geospatial property valuations.',
    ],
    tech: ['Laravel', 'React', 'Node.js', 'PostgreSQL', 'PostGIS', 'PHPUnit'],
  },
];

export default function Experience() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="experience" className="relative py-32 px-6" aria-label="Work experience">
      <div className="absolute top-0 right-0 w-72 h-72 bg-primary-600/5 rounded-full blur-[120px]" />

      <div className="max-w-5xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-primary-400 text-sm font-mono font-medium tracking-wider uppercase">
            Career
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold mt-4" style={{ color: 'var(--text-primary)' }}>
            Work <span className="gradient-text">Experience</span>
          </h2>
        </motion.div>

        <div className="relative">
          <div className="absolute left-0 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-primary-500/50 via-primary-600/20 to-transparent" />

          {experiences.map((exp, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + idx * 0.15 }}
              className="relative pl-8 md:pl-20 pb-12 last:pb-0 group"
            >
              <div
                className="absolute left-0 md:left-8 top-1 -translate-x-1/2 w-3 h-3 rounded-full bg-primary-500 group-hover:scale-125 transition-transform z-10"
                style={{ borderWidth: '4px', borderColor: 'var(--bg-primary)' }}
              />

              <div
                className="p-6 sm:p-8 rounded-2xl border transition-all duration-300 hover:border-primary-500/20"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-primary)',
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{exp.company}</h3>
                    <p className="text-primary-400 font-medium">{exp.role}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>{exp.period}</p>
                    <p className="text-sm" style={{ color: 'var(--text-faint)' }}>{exp.location}</p>
                  </div>
                </div>

                <ul className="space-y-2 mb-5">
                  {exp.highlights.map((h, i) => (
                    <li key={i} className="text-sm leading-relaxed flex gap-2" style={{ color: 'var(--text-muted)' }}>
                      <span className="text-primary-500 mt-1.5 shrink-0">&#9656;</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-2">
                  {exp.tech.map((t) => (
                    <span
                      key={t}
                      className="px-3 py-1 text-xs font-medium text-primary-300 bg-primary-600/10 border border-primary-500/20 rounded-full"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
