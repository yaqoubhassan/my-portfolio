export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  tags: string[];
  file: string;
  project?: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'building-ocpp-websocket-server',
    title: 'Building a Custom OCPP 1.6 WebSocket Server from Scratch',
    description: 'How we built an EV charging backend in PHP, and the cascade of 9 subtle bugs we uncovered when real chargers met real drivers.',
    date: '2026-04-01',
    readTime: '12 min read',
    tags: ['WebSocket', 'OCPP', 'PHP', 'Laravel'],
    file: '/blog/blog-ocpp-websocket-server.md',
    project: 'XChargeEV',
  },
  {
    slug: 'cron-jobs-race-realtime-server',
    title: 'When Cron Jobs Race Your Real-Time Server',
    description: 'How six independent scheduled tasks nearly broke our EV charging billing — and the orchestration pattern that fixed it.',
    date: '2026-04-02',
    readTime: '8 min read',
    tags: ['Concurrency', 'Laravel', 'OCPP', 'Billing'],
    file: '/blog/blog-cron-jobs-race-realtime.md',
    project: 'XChargeEV',
  },
  {
    slug: 'wallet-billing-system-ev-charging',
    title: 'Designing a Wallet-Based Billing System for EV Charging',
    description: 'Prepaid wallets, atomic operations, and the cron jobs that race your real-time server — lessons from billing real kilowatt-hours.',
    date: '2026-04-03',
    readTime: '9 min read',
    tags: ['Billing', 'Laravel', 'Fintech', 'Concurrency'],
    file: '/blog/blog-wallet-billing-system.md',
    project: 'XChargeEV',
  },
  {
    slug: 'iso15118-plug-and-charge',
    title: 'ISO 15118 Plug-and-Charge: Bridging the Gap Between Protocol and Product',
    description: 'What happens when an EV identifies itself before your system is ready — and why the charging spec doesn\'t tell you how to handle it.',
    date: '2026-04-03',
    readTime: '7 min read',
    tags: ['OCPP', 'ISO 15118', 'EV Charging', 'Protocol'],
    file: '/blog/blog-iso15118-plug-and-charge.md',
    project: 'XChargeEV',
  },
  {
    slug: 'producer-consumer-over-mysql',
    title: 'Producer-Consumer Over MySQL: A Low-Tech Approach to Process Communication',
    description: 'How we connected a Laravel API to a Ratchet WebSocket server using nothing but a database table and a 5-second timer.',
    date: '2026-04-04',
    readTime: '7 min read',
    tags: ['Architecture', 'MySQL', 'Laravel', 'WebSocket'],
    file: '/blog/blog-producer-consumer-over-mysql.md',
    project: 'XChargeEV',
  },
  {
    slug: 'connecting-microservices-mtn-ssp',
    title: 'Connecting 12+ Microservices: Lessons from the MTN Self-Service Portal',
    description: 'How we tamed a sprawling backend ecosystem, hardened the frontend, and shipped a performant telecom portal.',
    date: '2026-04-04',
    readTime: '15 min read',
    tags: ['React', 'TypeScript', 'Microservices', 'Auth0'],
    file: '/blog/blog-connecting-microservices-mtn-ssp.md',
    project: 'MTN SSP',
  },
  {
    slug: 'defending-the-frontend',
    title: 'Defending the Frontend: A Multi-Layer Sanitization System',
    description: 'A security audit flagged our telecom portal. Instead of patching holes, we built a defense system.',
    date: '2026-04-05',
    readTime: '13 min read',
    tags: ['Security', 'XSS', 'React', 'TypeScript'],
    file: '/blog/blog-defending-the-frontend.md',
    project: 'MTN SSP',
  },
  {
    slug: 'progressive-loading-patterns',
    title: 'Progressive Loading: Why We Stopped Showing Spinners',
    description: 'How rethinking loading states cut perceived load time in half — without changing a single API call.',
    date: '2026-04-05',
    readTime: '14 min read',
    tags: ['React', 'UX', 'Performance', 'TypeScript'],
    file: '/blog/blog-progressive-loading.md',
    project: 'MTN SSP',
  },
  {
    slug: 'building-agritrack-africa',
    title: 'Building AgriTrack Africa: Engineering a Livestock Management Platform',
    description: 'A deep dive into architecture, security patterns, and hard-won lessons from building for offline-first African markets.',
    date: '2026-04-06',
    readTime: '13 min read',
    tags: ['NestJS', 'Next.js', 'React Native', 'System Design'],
    file: '/blog/blog-building-agritrack-africa.md',
    project: 'AgriTrack',
  },
  {
    slug: 'monolith-to-monorepo',
    title: 'From Monolith to Monorepo: Scaling AgriTrack Africa',
    description: 'How we restructured a growing platform into a monorepo — and why the hardest part was not the tooling.',
    date: '2026-04-07',
    readTime: '16 min read',
    tags: ['Monorepo', 'Turborepo', 'pnpm', 'Architecture'],
    file: '/blog/blog-monolith-to-monorepo.md',
    project: 'AgriTrack',
  },
];
