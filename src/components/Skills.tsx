import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  SiTypescript, SiJavascript, SiPhp, SiPython, SiDart,
  SiLaravel, SiVuedotjs, SiNuxt, SiReact, SiNextdotjs,
  SiExpress, SiFlutter, SiTailwindcss, SiIonic,
  SiMysql, SiPostgresql, SiMongodb, SiRedis,
  SiDocker, SiNginx, SiGit, SiGithub, SiGitlab,
  SiFirebase, SiStripe, SiAuth0, SiPostman, SiVite,
  SiDigitalocean, SiHeroku,
} from 'react-icons/si';

const skillCategories = [
  {
    title: 'Languages',
    skills: [
      { name: 'TypeScript', icon: SiTypescript, color: '#3178c6' },
      { name: 'JavaScript', icon: SiJavascript, color: '#f7df1e' },
      { name: 'PHP', icon: SiPhp, color: '#777bb4' },
      { name: 'Python', icon: SiPython, color: '#3776ab' },
      { name: 'Dart', icon: SiDart, color: '#0175c2' },
    ],
  },
  {
    title: 'Frameworks',
    skills: [
      { name: 'Laravel', icon: SiLaravel, color: '#ff2d20' },
      { name: 'Vue.js', icon: SiVuedotjs, color: '#4fc08d' },
      { name: 'Nuxt.js', icon: SiNuxt, color: '#00dc82' },
      { name: 'React', icon: SiReact, color: '#61dafb' },
      { name: 'Next.js', icon: SiNextdotjs, color: '#ffffff' },
      { name: 'Express.js', icon: SiExpress, color: '#ffffff' },
      { name: 'Ionic', icon: SiIonic, color: '#3880ff' },
      { name: 'Flutter', icon: SiFlutter, color: '#02569b' },
      { name: 'Tailwind CSS', icon: SiTailwindcss, color: '#06b6d4' },
    ],
  },
  {
    title: 'Databases',
    skills: [
      { name: 'MySQL', icon: SiMysql, color: '#4479a1' },
      { name: 'PostgreSQL', icon: SiPostgresql, color: '#4169e1' },
      { name: 'MongoDB', icon: SiMongodb, color: '#47a248' },
      { name: 'Redis', icon: SiRedis, color: '#dc382d' },
    ],
  },
  {
    title: 'DevOps & Tools',
    skills: [
      { name: 'Docker', icon: SiDocker, color: '#2496ed' },
      { name: 'Nginx', icon: SiNginx, color: '#009639' },
      { name: 'Git', icon: SiGit, color: '#f05032' },
      { name: 'GitHub', icon: SiGithub, color: '#ffffff' },
      { name: 'GitLab', icon: SiGitlab, color: '#fc6d26' },
      { name: 'Vite', icon: SiVite, color: '#646cff' },
      { name: 'Postman', icon: SiPostman, color: '#ff6c37' },
      { name: 'DigitalOcean', icon: SiDigitalocean, color: '#0080ff' },
      { name: 'Heroku', icon: SiHeroku, color: '#430098' },
    ],
  },
  {
    title: 'Platforms & APIs',
    skills: [
      { name: 'Firebase', icon: SiFirebase, color: '#ffca28' },
      { name: 'Stripe', icon: SiStripe, color: '#635bff' },
      { name: 'Auth0', icon: SiAuth0, color: '#eb5424' },
    ],
  },
];

export default function Skills() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="skills" className="relative py-16 sm:py-24 px-5 sm:px-6" aria-label="Skills and technologies">
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent-500/5 rounded-full blur-[120px]" />

      <div className="max-w-6xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-14"
        >
          <span className="text-primary-400 text-sm font-mono font-medium tracking-wider uppercase">
            Tech Stack
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-3 sm:mt-4" style={{ color: 'var(--text-primary)' }}>
            Skills & <span className="gradient-text">Technologies</span>
          </h2>
        </motion.div>

        <div className="space-y-12">
          {skillCategories.map((cat, catIdx) => (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + catIdx * 0.1 }}
            >
              <h3 className="text-sm font-mono uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                {cat.title}
              </h3>
              <div className="flex flex-wrap gap-3">
                {cat.skills.map((skill, skillIdx) => (
                  <motion.div
                    key={skill.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{
                      duration: 0.3,
                      delay: 0.2 + catIdx * 0.1 + skillIdx * 0.05,
                    }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all duration-300 cursor-default"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-primary)',
                    }}
                  >
                    <skill.icon
                      size={18}
                      style={{ color: skill.color }}
                      className="group-hover:scale-110 transition-transform"
                    />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {skill.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
