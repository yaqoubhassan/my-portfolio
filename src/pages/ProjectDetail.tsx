import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiExternalLink, FiCheck } from 'react-icons/fi';
import { projectDetails } from '../data/projectDetails';
import { useEffect, useState } from 'react';

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>();
  const project = projectDetails.find((p) => p.slug === slug);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Project not found
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

  return (
    <>
      <div className="min-h-screen pt-20 sm:pt-24 pb-16 sm:pb-20 px-5 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Back link */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Link
              to="/#projects"
              className="inline-flex items-center gap-2 text-sm mb-6 sm:mb-10 transition-colors hover:text-primary-400"
              style={{ color: 'var(--text-muted)' }}
            >
              <FiArrowLeft size={14} />
              Back to all projects
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 sm:mb-12"
          >
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-primary-400 text-sm font-mono font-medium tracking-wider uppercase">
                Case Study
              </span>
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-primary-600/10 border border-primary-500/20 text-primary-400 hover:bg-primary-600/20 transition-colors"
                >
                  <FiExternalLink size={11} />
                  Live Site
                </a>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4" style={{ color: 'var(--text-primary)' }}>
              {project.title}
            </h1>
            <p className="text-xl leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {project.subtitle}
            </p>
          </motion.div>

          {/* Meta info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid sm:grid-cols-3 gap-6 mb-14 p-6 rounded-2xl border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <div>
              <p className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--text-faint)' }}>Role</p>
              <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{project.role}</p>
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--text-faint)' }}>Timeline</p>
              <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{project.timeline}</p>
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--text-faint)' }}>Company</p>
              <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{project.company}</p>
            </div>
          </motion.div>

          {/* Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mb-10 sm:mb-14"
          >
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Overview</h2>
            <p className="text-lg leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {project.description}
            </p>
          </motion.div>

          {/* Tech stack */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-10 sm:mb-14"
          >
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Tech Stack</h2>
            <div className="flex flex-wrap gap-2">
              {project.tech.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1.5 text-sm font-medium text-primary-300 bg-primary-600/10 border border-primary-500/20 rounded-full"
                >
                  {t}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Key highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mb-10 sm:mb-14"
          >
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Key Highlights</h2>
            <ul className="space-y-3">
              {project.highlights.map((h, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="mt-1 shrink-0 w-5 h-5 rounded-full bg-accent-500/15 flex items-center justify-center">
                    <FiCheck size={12} className="text-accent-500" />
                  </span>
                  <span className="text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>{h}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-10 sm:mb-14"
          >
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Features</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {project.features.map((f, i) => (
                <div
                  key={i}
                  className="flex gap-2.5 items-start p-3 rounded-xl border"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-primary)',
                  }}
                >
                  <span className="text-primary-500 mt-0.5 shrink-0">&#9656;</span>
                  <span className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Challenges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mb-10 sm:mb-14"
          >
            <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
              Challenges & Solutions
            </h2>
            <div className="space-y-6">
              {project.challenges.map((c, i) => (
                <div
                  key={i}
                  className="p-6 rounded-2xl border"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-primary)',
                  }}
                >
                  <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                    {c.title}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-wider mb-1 text-red-400/80">Challenge</p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{c.description}</p>
                    </div>
                    <div>
                      <p className="text-xs font-mono uppercase tracking-wider mb-1 text-accent-500">Solution</p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{c.solution}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Screenshots */}
          {project.screenshots.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mb-10 sm:mb-14"
            >
              <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Screenshots</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {project.screenshots.map((ss, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(ss.src)}
                    className="group cursor-pointer text-left rounded-xl overflow-hidden border transition-all duration-300 hover:border-primary-500/30"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-primary)',
                    }}
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={ss.src}
                        alt={ss.alt}
                        loading="lazy"
                        className="w-full h-48 object-cover object-top group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerHTML =
                            '<div class="w-full h-48 flex items-center justify-center" style="color: var(--text-dimmed)"><span class="text-sm">Screenshot coming soon</span></div>';
                        }}
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-faint)' }}>{ss.caption}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Navigation to other projects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="pt-8 border-t"
            style={{ borderColor: 'var(--border-primary)' }}
          >
            <p className="text-xs font-mono uppercase tracking-wider mb-4" style={{ color: 'var(--text-faint)' }}>
              Other Case Studies
            </p>
            <div className="flex flex-wrap gap-3">
              {projectDetails
                .filter((p) => p.slug !== project.slug)
                .map((p) => (
                  <Link
                    key={p.slug}
                    to={`/projects/${p.slug}`}
                    className="px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-300 hover:border-primary-500/30 hover:bg-primary-600/5"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-primary)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {p.title}
                  </Link>
                ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            src={selectedImage}
            alt="Screenshot"
            className="max-w-full max-h-[90vh] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
