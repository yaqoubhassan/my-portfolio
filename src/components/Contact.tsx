import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useState } from 'react';
import { FiMail, FiPhone, FiMapPin, FiSend, FiGithub, FiLinkedin, FiCheck, FiAlertCircle } from 'react-icons/fi';
import emailjs from '@emailjs/browser';

const EMAILJS_SERVICE_ID = 'service_ztgwikb';
const EMAILJS_TEMPLATE_ID = 'template_jc81ekb';
const EMAILJS_PUBLIC_KEY = '4BM3tyy5nrBXW1ldX';

function SuccessAnimation() {
  return (
    <motion.div className="flex flex-col items-center gap-3 py-4">
      {/* Animated circle with checkmark */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.5, duration: 0.6 }}
        className="w-16 h-16 rounded-full bg-accent-500/15 flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: 'spring', bounce: 0.4 }}
        >
          <FiCheck size={32} className="text-accent-500" strokeWidth={3} />
        </motion.div>
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-lg font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        Message Sent!
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-sm text-center"
        style={{ color: 'var(--text-muted)' }}
      >
        Thanks for reaching out. I'll get back to you soon.
      </motion.p>
    </motion.div>
  );
}

function ErrorAnimation() {
  return (
    <motion.div className="flex flex-col items-center gap-3 py-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.5, duration: 0.6 }}
        className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', bounce: 0.4 }}
        >
          <FiAlertCircle size={32} className="text-red-500" strokeWidth={2.5} />
        </motion.div>
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-lg font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        Failed to Send
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-sm text-center"
        style={{ color: 'var(--text-muted)' }}
      >
        Something went wrong. Please try again or email me directly.
      </motion.p>
    </motion.div>
  );
}

export default function Contact() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name: formData.name,
          from_email: formData.email,
          message: formData.message,
        },
        EMAILJS_PUBLIC_KEY,
      );
      setStatus('sent');
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => setStatus('idle'), 5000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  const contactInfo = [
    { icon: FiMail, label: 'Email', value: 'yaqoubdramani@gmail.com', href: 'mailto:yaqoubdramani@gmail.com' },
    { icon: FiPhone, label: 'Phone', value: '+233 249 952 818', href: 'tel:+233245660316' },
    { icon: FiMapPin, label: 'Location', value: 'Accra, Ghana', href: null },
  ];

  return (
    <section id="contact" className="relative py-32 px-6" aria-label="Contact">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-600/5 rounded-full blur-[150px]" />

      <div className="max-w-5xl mx-auto" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-primary-400 text-sm font-mono font-medium tracking-wider uppercase">
            Get In Touch
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold mt-4" style={{ color: 'var(--text-primary)' }}>
            Let's <span className="gradient-text">Connect</span>
          </h2>
          <p className="mt-4 max-w-xl mx-auto" style={{ color: 'var(--text-muted)' }}>
            Have a project in mind or want to discuss opportunities? I'd love to
            hear from you.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-5 gap-10">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-2 space-y-6"
          >
            {contactInfo.map((info) => (
              <div key={info.label} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary-600/10 flex items-center justify-center shrink-0">
                  <info.icon className="text-primary-400" size={18} />
                </div>
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-faint)' }}>{info.label}</p>
                  {info.href ? (
                    <a
                      href={info.href}
                      className="hover:text-primary-400 transition-colors font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {info.value}
                    </a>
                  ) : (
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{info.value}</p>
                  )}
                </div>
              </div>
            ))}

            <div className="pt-4">
              <p className="text-sm mb-3" style={{ color: 'var(--text-faint)' }}>Follow me</p>
              <div className="flex gap-3">
                {[
                  { icon: FiGithub, href: 'https://github.com/yaqoubhassan', label: 'GitHub' },
                  { icon: FiLinkedin, href: 'https://linkedin.com/in/yakubu-alhassan-ba4403125', label: 'LinkedIn' },
                ].map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl border flex items-center justify-center transition-all hover:border-primary-500/30"
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderColor: 'var(--border-primary)',
                      color: 'var(--text-muted)',
                    }}
                    aria-label={social.label}
                  >
                    <social.icon size={18} />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="md:col-span-3"
          >
            <AnimatePresence mode="wait">
              {status === 'sent' ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-center rounded-2xl border p-12"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-primary)',
                  }}
                >
                  <SuccessAnimation />
                </motion.div>
              ) : status === 'error' ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center rounded-2xl border p-12"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-primary)',
                  }}
                >
                  <ErrorAnimation />
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    onClick={() => setStatus('idle')}
                    className="mt-4 text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors cursor-pointer"
                  >
                    Try again
                  </motion.button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="contact-name" className="block text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Name</label>
                      <input
                        id="contact-name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:border-primary-500/50"
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          borderColor: 'var(--border-primary)',
                          color: 'var(--text-primary)',
                        }}
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="block text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Email</label>
                      <input
                        id="contact-email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:border-primary-500/50"
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          borderColor: 'var(--border-primary)',
                          color: 'var(--text-primary)',
                        }}
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="contact-message" className="block text-sm mb-2" style={{ color: 'var(--text-muted)' }}>Message</label>
                    <textarea
                      id="contact-message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border transition-all resize-none focus:outline-none focus:border-primary-500/50"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        borderColor: 'var(--border-primary)',
                        color: 'var(--text-primary)',
                      }}
                      placeholder="Tell me about your project..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-70 text-white rounded-full font-medium transition-all duration-300 shadow-lg shadow-primary-600/25 hover:shadow-primary-500/40 cursor-pointer"
                  >
                    {status === 'sending' ? (
                      <>
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Message <FiSend size={16} />
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
