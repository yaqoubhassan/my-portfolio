import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiClock, FiArrowRight } from 'react-icons/fi';
import { blogPosts } from '../data/blogPosts';
import { useEffect } from 'react';

export default function BlogList() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const sortedPosts = [...blogPosts].reverse();

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-16 sm:pb-20 px-5 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm mb-6 sm:mb-10 transition-colors hover:text-primary-400"
            style={{ color: 'var(--text-muted)' }}
          >
            <FiArrowLeft size={14} />
            Back to home
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 sm:mb-14"
        >
          <span className="text-primary-400 text-sm font-mono font-medium tracking-wider uppercase">
            Blog
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-3" style={{ color: 'var(--text-primary)' }}>
            All <span className="gradient-text">Articles</span>
          </h1>
          <p className="mt-4 max-w-xl" style={{ color: 'var(--text-muted)' }}>
            {blogPosts.length} articles on building production systems, debugging real-world bugs, and engineering at scale.
          </p>
        </motion.div>

        {/* Articles */}
        <div className="space-y-4">
          {sortedPosts.map((post, idx) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
            >
              <Link
                to={`/blog/${post.slug}`}
                className="group flex flex-col sm:flex-row sm:items-center gap-4 p-5 sm:p-6 rounded-2xl border transition-all duration-300 hover:border-primary-500/30"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-primary)',
                }}
              >
                <div className="grow">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full text-primary-300 bg-primary-600/10 border border-primary-500/20"
                      >
                        {tag}
                      </span>
                    ))}
                    {post.project && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent-500/10 text-accent-500 border border-accent-500/20">
                        {post.project}
                      </span>
                    )}
                  </div>

                  <h2
                    className="text-lg font-bold leading-snug mb-1 group-hover:text-primary-400 transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {post.title}
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {post.description}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'var(--text-faint)' }}>
                    <span>{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="flex items-center gap-1">
                      <FiClock size={11} />
                      {post.readTime}
                    </span>
                  </div>
                </div>

                <span className="hidden sm:block text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <FiArrowRight size={18} />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
