import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiExternalLink, FiGithub, FiArrowRight } from 'react-icons/fi';
import {
  SiLaravel, SiNuxt, SiIonic, SiReact,
  SiNextdotjs, SiVuedotjs, SiTypescript, SiPostgresql, SiNestjs,
} from 'react-icons/si';
import { FiZap } from 'react-icons/fi';

const projects = [
  {
    title: 'XChargeEV Platform',
    slug: 'xchargeev',
    description:
      'Full-stack EV charging platform powering DriveEV Ghana\'s charger network. Includes a Laravel API, Nuxt 3 web admin, Ionic Vue mobile app, PWA, and a custom OCPP 1.6 WebSocket server. Solo-maintained across 5 codebases.',
    image: '/screenshots/xchargeev/admin-dashboard.png',
    tags: [
      { name: 'Laravel 11', icon: SiLaravel },
      { name: 'Nuxt 3', icon: SiNuxt },
      { name: 'Ionic Vue', icon: SiIonic },
      { name: 'OCPP 1.6', icon: FiZap },
    ],
    links: [
      { label: 'Web Admin', url: 'https://web.xchargeev.com' },
      { label: 'PWA', url: 'https://pwa.xchargeev.com' },
    ],
    featured: true,
  },
  {
    title: 'MTN Self-Service Portal',
    slug: 'mtn-ssp',
    description:
      'Production-ready customer portal for MTN Ghana built with React 19 and TypeScript. Connects 12+ backend microservices with Auth0 authentication, OpenTelemetry observability, and responsive dark/light theming.',
    image: '/screenshots/mtn/dashboard.png',
    tags: [
      { name: 'React 19', icon: SiReact },
      { name: 'TypeScript', icon: SiTypescript },
    ],
    links: [{ label: 'Visit', url: 'https://selfservice.mtn.com.gh/' }],
    featured: true,
  },
  {
    title: 'Walulel',
    slug: null,
    description:
      'Property valuation platform using AI algorithms for accurate real estate valuations. Led backend development and API integration with PostGIS for geospatial computations.',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=450&fit=crop',
    tags: [
      { name: 'Laravel', icon: SiLaravel },
      { name: 'React', icon: SiReact },
      { name: 'PostgreSQL', icon: SiPostgresql },
    ],
    links: [{ label: 'Visit', url: 'https://walulel.com' }],
    featured: false,
  },
  {
    title: 'AgriTrack Africa Admin',
    slug: 'agritrack-africa',
    description:
      'Super admin dashboard for AgriTrack Africa, a livestock and farm management platform serving farmers across Ghana. 16-page admin with role-gated access, 30+ API endpoints, real-time analytics, notification broadcasting, and CSV export across 15 modules.',
    image: '/screenshots/ata/dashboard.png',
    tags: [
      { name: 'Next.js 16', icon: SiNextdotjs },
      { name: 'NestJS 11', icon: SiNestjs },
      { name: 'TypeScript', icon: SiTypescript },
      { name: 'PostgreSQL', icon: SiPostgresql },
    ],
    links: [{ label: 'Visit', url: 'https://app.agritrackafrica.com/' }],
    featured: false,
  },
  {
    title: 'Job Board Platform',
    slug: null,
    description:
      'Full-stack job board with AI-powered CV and cover letter generation using OpenAI. Stripe payment integration reduced checkout abandonment by 20%.',
    image: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&h=450&fit=crop',
    tags: [
      { name: 'Laravel 10', icon: SiLaravel },
      { name: 'Vue.js', icon: SiVuedotjs },
    ],
    links: [{ label: 'Visit', url: 'https://vitaevisual.com' }],
    featured: false,
  },
  {
    title: 'WA-Insight',
    slug: null,
    description:
      'Data analytics dashboard providing real-time property market insights through interactive visualizations and comprehensive reporting.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop',
    tags: [
      { name: 'React', icon: SiReact },
      { name: 'Laravel', icon: SiLaravel },
    ],
    links: [{ label: 'Visit', url: 'https://walulel.com/wa-insight' }],
    featured: false,
  },
];

export default function Projects() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="projects" className="relative py-16 sm:py-24 px-5 sm:px-6" aria-label="Featured projects">
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-primary-600/5 rounded-full blur-[150px]" />

      <div className="max-w-6xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-14"
        >
          <span className="text-primary-400 text-sm font-mono font-medium tracking-wider uppercase">
            Portfolio
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-3 sm:mt-4" style={{ color: 'var(--text-primary)' }}>
            Featured <span className="gradient-text">Projects</span>
          </h2>
        </motion.div>

        {/* Featured projects */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {projects
            .filter((p) => p.featured)
            .map((project, idx) => (
              <motion.div
                key={project.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + idx * 0.15 }}
                className="group relative rounded-2xl overflow-hidden border hover:border-primary-500/30 transition-all duration-500"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-primary)',
                }}
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={project.image}
                    alt={project.title}
                    loading="lazy"
                    className="w-full h-full object-cover object-top-left group-hover:scale-105 transition-transform duration-700"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(to top, var(--gradient-overlay-from), var(--gradient-overlay-via), transparent)`,
                    }}
                  />
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                    {project.title}
                  </h3>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-muted)' }}>
                    {project.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tags.map((tag) => (
                      <span
                        key={tag.name}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-primary-300 bg-primary-600/10 border border-primary-500/20 rounded-full"
                      >
                        <tag.icon size={12} />
                        {tag.name}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-4">
                    {project.links.map((link) => (
                      <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm hover:text-primary-400 transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <FiExternalLink size={14} />
                        {link.label}
                      </a>
                    ))}
                    {project.slug && (
                      <Link
                        to={`/projects/${project.slug}`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors ml-auto"
                      >
                        Case Study
                        <FiArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
        </div>

        {/* Other projects */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {projects
            .filter((p) => !p.featured)
            .map((project, idx) => (
              <motion.div
                key={project.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.4 + idx * 0.1 }}
                className="group p-5 rounded-2xl border transition-all duration-300 hover:border-primary-500/20"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-primary)',
                }}
              >
                <h4 className="font-semibold mb-2 flex items-center justify-between" style={{ color: 'var(--text-primary)' }}>
                  {project.title}
                  {project.links.length > 0 && (
                    <a
                      href={project.links[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative z-10 p-1 cursor-pointer hover:text-primary-400 transition-colors"
                      style={{ color: 'var(--text-faint)' }}
                      aria-label={`Visit ${project.title}`}
                    >
                      <FiExternalLink size={14} />
                    </a>
                  )}
                </h4>
                <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-faint)' }}>
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {project.tags.map((tag) => (
                    <span
                      key={tag.name}
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        color: 'var(--text-muted)',
                        backgroundColor: 'var(--bg-subtle)',
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
                {project.slug && (
                  <Link
                    to={`/projects/${project.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    View Case Study
                    <FiArrowRight size={12} />
                  </Link>
                )}
              </motion.div>
            ))}
        </div>

        {/* GitHub link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
          className="text-center mt-12"
        >
          <a
            href="https://github.com/yaqoubhassan"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 hover:text-primary-400 transition-colors text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            <FiGithub size={16} />
            View more on GitHub
          </a>
        </motion.div>
      </div>
    </section>
  );
}
