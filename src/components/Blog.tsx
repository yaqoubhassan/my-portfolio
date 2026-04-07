import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { FiClock, FiArrowRight } from 'react-icons/fi';

const posts = [
  {
    title: 'Building a Custom OCPP 1.6 WebSocket Server from Scratch',
    excerpt:
      'How I designed and implemented a production-grade OCPP server to manage real-time communication with 18+ EV charging stations across Ghana.',
    date: 'Coming Soon',
    readTime: '10 min read',
    tags: ['WebSocket', 'OCPP', 'Node.js'],
  },
  {
    title: 'Connecting 12+ Microservices: Lessons from the MTN SSP Frontend',
    excerpt:
      'Retry logic, circuit breakers, and error normalization — the patterns I used to build a reliable frontend for MTN Ghana\'s self-service portal.',
    date: 'Coming Soon',
    readTime: '8 min read',
    tags: ['React', 'Architecture', 'TypeScript'],
  },
  {
    title: 'From Monolith to Monorepo: Scaling AgriTrack Africa',
    excerpt:
      'How I structured a monorepo with Next.js, React Native, and NestJS to serve a cross-platform farm management system with 15 modules.',
    date: 'Coming Soon',
    readTime: '7 min read',
    tags: ['NestJS', 'Next.js', 'Monorepo'],
  },
];

export default function Blog() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="blog" className="relative py-32 px-6" aria-label="Blog">
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-primary-600/5 rounded-full blur-[120px]" />

      <div className="max-w-6xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-primary-400 text-sm font-mono font-medium tracking-wider uppercase">
            Insights
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold mt-4" style={{ color: 'var(--text-primary)' }}>
            Technical <span className="gradient-text">Blog</span>
          </h2>
          <p className="mt-4 max-w-xl mx-auto" style={{ color: 'var(--text-muted)' }}>
            Sharing lessons learned from building production systems at scale.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {posts.map((post, idx) => (
            <motion.article
              key={post.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + idx * 0.1 }}
              className="group flex flex-col p-6 rounded-2xl border transition-all duration-300 hover:border-primary-500/30"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-primary)',
              }}
            >
              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full text-primary-300 bg-primary-600/10 border border-primary-500/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Title */}
              <h3
                className="text-lg font-bold mb-2 leading-snug"
                style={{ color: 'var(--text-primary)' }}
              >
                {post.title}
              </h3>

              {/* Excerpt */}
              <p className="text-sm leading-relaxed mb-4 flex-grow" style={{ color: 'var(--text-muted)' }}>
                {post.excerpt}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-faint)' }}>
                  <span>{post.date}</span>
                  <span className="flex items-center gap-1">
                    <FiClock size={11} />
                    {post.readTime}
                  </span>
                </div>
                <span className="text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <FiArrowRight size={14} />
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
