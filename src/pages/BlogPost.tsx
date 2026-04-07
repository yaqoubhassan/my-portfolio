import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiClock, FiCalendar } from 'react-icons/fi';
import { blogPosts } from '../data/blogPosts';
import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'highlight.js/styles/github-dark.min.css';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = blogPosts.find((p) => p.slug === slug);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    if (!post) return;
    fetch(post.file)
      .then((res) => res.text())
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [post]);

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Post not found
          </h1>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors"
          >
            <FiArrowLeft size={16} />
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-16 sm:pb-20 px-5 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            to="/#blog"
            className="inline-flex items-center gap-2 text-sm mb-6 sm:mb-10 transition-colors hover:text-primary-400"
            style={{ color: 'var(--text-muted)' }}
          >
            <FiArrowLeft size={14} />
            Back to all posts
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 sm:mb-12"
        >
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium px-2.5 py-1 rounded-full text-primary-300 bg-primary-600/10 border border-primary-500/20"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4" style={{ color: 'var(--text-primary)' }}>
            {post.title}
          </h1>

          <p className="text-base sm:text-lg leading-relaxed mb-6" style={{ color: 'var(--text-muted)' }}>
            {post.description}
          </p>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm pb-6 border-b" style={{ color: 'var(--text-faint)', borderColor: 'var(--border-primary)' }}>
            <span className="flex items-center gap-1.5">
              <FiCalendar size={14} />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1.5">
              <FiClock size={14} />
              {post.readTime}
            </span>
            {post.project && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-500/10 text-accent-500 border border-accent-500/20">
                {post.project}
              </span>
            )}
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: loading ? 0 : 1 }}
          transition={{ duration: 0.4 }}
        >
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-4 rounded"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    width: `${70 + Math.random() * 30}%`,
                  }}
                />
              ))}
            </div>
          ) : content ? (
            <article className="prose-custom">
              <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
            </article>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>Failed to load article.</p>
          )}
        </motion.div>

        {/* Navigation to other posts */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-12 sm:mt-16 pt-8 border-t"
            style={{ borderColor: 'var(--border-primary)' }}
          >
            <p className="text-xs font-mono uppercase tracking-wider mb-4" style={{ color: 'var(--text-faint)' }}>
              More Articles
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {blogPosts
                .filter((p) => p.slug !== post.slug)
                .slice(0, 4)
                .map((p) => (
                  <Link
                    key={p.slug}
                    to={`/blog/${p.slug}`}
                    className="p-4 rounded-xl border text-sm transition-all duration-300 hover:border-primary-500/30 hover:bg-primary-600/5 block"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-primary)',
                    }}
                  >
                    <p className="font-semibold mb-1 leading-snug" style={{ color: 'var(--text-primary)' }}>
                      {p.title}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                      {p.readTime}
                    </p>
                  </Link>
                ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
