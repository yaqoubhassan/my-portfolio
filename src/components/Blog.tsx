import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiClock, FiArrowRight } from 'react-icons/fi';
import { blogPosts } from '../data/blogPosts';

export default function Blog() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  // Show latest 3 posts
  const latestPosts = [...blogPosts].reverse().slice(0, 3);

  return (
    <section id="blog" className="relative py-16 sm:py-24 px-5 sm:px-6" aria-label="Blog">
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-primary-600/5 rounded-full blur-[120px]" />

      <div className="max-w-6xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-14"
        >
          <span className="text-primary-400 text-sm font-mono font-medium tracking-wider uppercase">
            Insights
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-3 sm:mt-4" style={{ color: 'var(--text-primary)' }}>
            Technical <span className="gradient-text">Blog</span>
          </h2>
          <p className="mt-4 max-w-xl mx-auto" style={{ color: 'var(--text-muted)' }}>
            Sharing lessons learned from building production systems at scale.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {latestPosts.map((post, idx) => (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + idx * 0.1 }}
            >
              <Link
                to={`/blog/${post.slug}`}
                className="group flex flex-col h-full p-6 rounded-2xl border transition-all duration-300 hover:border-primary-500/30"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-primary)',
                }}
              >
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.slice(0, 3).map((tag) => (
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
                  className="text-lg font-bold mb-2 leading-snug group-hover:text-primary-400 transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {post.title}
                </h3>

                {/* Excerpt */}
                <p className="text-sm leading-relaxed mb-4 grow" style={{ color: 'var(--text-muted)' }}>
                  {post.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-faint)' }}>
                    <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="flex items-center gap-1">
                      <FiClock size={11} />
                      {post.readTime}
                    </span>
                  </div>
                  <span className="text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <FiArrowRight size={14} />
                  </span>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>

        {/* View all link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
          className="text-center mt-10"
        >
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors"
          >
            View all {blogPosts.length} articles
            <FiArrowRight size={14} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
