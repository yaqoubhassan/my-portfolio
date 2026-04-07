export interface ProjectDetail {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  role: string;
  timeline: string;
  company: string;
  liveUrl?: string;
  tech: string[];
  highlights: string[];
  challenges: {
    title: string;
    description: string;
    solution: string;
  }[];
  features: string[];
  screenshots: {
    src: string;
    alt: string;
    caption: string;
  }[];
}

export const projectDetails: ProjectDetail[] = [
  {
    slug: 'xchargeev',
    title: 'XChargeEV Platform',
    subtitle: 'Full-stack EV charging platform powering DriveEV Ghana\'s charger network',
    description:
      'A comprehensive electric vehicle charging ecosystem that I single-handedly maintain and develop. The platform spans 5 codebases — a Laravel 11 REST API, Nuxt 3 web admin dashboard, Ionic Vue mobile app, a Progressive Web App, and a custom OCPP 1.6 WebSocket server for real-time charger communication. It serves DriveEV Ghana\'s growing network of 18+ charging stations across Ghana.',
    role: 'Senior Fullstack Developer (Sole Developer)',
    timeline: 'Nov 2025 – Present',
    company: 'DriveEV Ghana',
    liveUrl: 'https://web.xchargeev.com',
    tech: [
      'Laravel 11', 'Nuxt 3', 'Ionic Vue', 'Vue.js', 'TypeScript',
      'OCPP 1.6', 'WebSocket', 'Paystack', 'FCM v1', 'WhatsApp Cloud API',
      'MySQL', 'Redis', 'Docker', 'Nginx',
    ],
    highlights: [
      'Sole ownership of the entire platform across 5 codebases',
      'Resolved critical OCPP race conditions recovering significant recurring revenue',
      'Fixed negative wallet balance exploits that were causing financial losses',
      'Designed a 6-epic fleet management system from scratch',
      'Integrated multi-channel notifications: FCM, SMS, WhatsApp, email, and in-app',
      'Built Paystack payment reconciliation with MTN, Vodafone, and AirtelTigo mobile money',
    ],
    challenges: [
      {
        title: 'OCPP Race Conditions',
        description:
          'The OCPP 1.6 WebSocket server had race conditions where multiple concurrent status notifications would create duplicate charging sessions and corrupt transaction records.',
        solution:
          'Implemented mutex locks and idempotency keys on transaction processing. Added a state machine for charger status transitions that rejects invalid state changes, preventing duplicate sessions.',
      },
      {
        title: 'Negative Wallet Balance Exploits',
        description:
          'Users discovered they could initiate charging sessions faster than the balance check could process, allowing them to charge with insufficient funds.',
        solution:
          'Moved balance validation into a database transaction with row-level locking. Added optimistic concurrency control on the wallet model to prevent TOCTOU (time-of-check-time-of-use) vulnerabilities.',
      },
      {
        title: 'Real-time Charger Communication',
        description:
          'Managing bidirectional communication with 18+ physical chargers across Ghana with varying network reliability and firmware versions.',
        solution:
          'Built a custom OCPP 1.6 WebSocket server with heartbeat monitoring, automatic reconnection handling, and a command queue for offline chargers that replays when they come back online.',
      },
    ],
    features: [
      'Real-time charger monitoring and station management',
      'Mobile app with map-based station finder and live availability',
      'Wallet system with mobile money top-up (MTN, Vodafone, AirtelTigo)',
      'Fleet management: driver groups, spending limits, vehicle custodianship',
      'Dashboard analytics: revenue, power delivery trends, station status',
      'Multi-channel notifications: push, SMS, WhatsApp, email, in-app',
      'PWA for lightweight mobile access',
      'Admin panel for charger configuration, user management, and reporting',
    ],
    screenshots: [
      { src: '/screenshots/xchargeev/admin-dashboard.png', alt: 'XChargeEV Admin Dashboard', caption: 'Admin dashboard with real-time analytics, revenue tracking, power delivery trends, and station status' },
      { src: '/screenshots/xchargeev/pwa-login.png', alt: 'XChargeEV PWA Login', caption: 'Mobile PWA login screen with phone-based authentication' },
      { src: '/screenshots/xchargeev/pwa-map.png', alt: 'XChargeEV Station Map', caption: 'Map view showing 18 charging stations across Ghana with real-time availability' },
      { src: '/screenshots/xchargeev/pwa-chargers.png', alt: 'XChargeEV Available Chargers', caption: 'Charger listing with real-time status (Online/Offline) and charger type indicators' },
      { src: '/screenshots/xchargeev/pwa-home.png', alt: 'XChargeEV PWA Home', caption: 'User dashboard with power consumption analytics and transaction history' },
      { src: '/screenshots/xchargeev/pwa-wallet.png', alt: 'XChargeEV Wallet', caption: 'Wallet with mobile money top-up and transaction history' },
      { src: '/screenshots/xchargeev/pwa-settings.png', alt: 'XChargeEV Settings', caption: 'User settings with profile management and notification preferences' },
    ],
  },
  {
    slug: 'mtn-ssp',
    title: 'MTN Self-Service Portal',
    subtitle: 'Production customer portal for MTN Ghana\'s subscriber base',
    description:
      'A production-ready self-service portal built from scratch for MTN Ghana — one of the largest telecom providers in West Africa. The portal enables MTN customers to manage their mobile accounts, broadband services, fibre requests, and account settings through a clean, accessible interface. The frontend connects to 12+ backend microservices with robust error handling and retry logic.',
    role: 'Software Engineer (Team Lead)',
    timeline: 'Mar 2025 – Present',
    company: 'Dexwin Tech Limited',
    liveUrl: 'https://selfservice.mtn.com.gh',
    tech: [
      'React 19', 'TypeScript', 'Tailwind CSS 4', 'Auth0', 'OAuth 2.0',
      'OpenTelemetry', 'Azure DevOps', 'Docker', 'REST APIs',
    ],
    highlights: [
      'Built the entire frontend from scratch — successfully launched for MTN Ghana',
      'Engineered API integration layer connecting 12+ backend microservices',
      'Implemented retry logic with exponential backoff for unreliable upstream services',
      'Led agile ceremonies: daily standups, bi-weekly sprint planning, sprint reviews',
      'Integrated OpenTelemetry for distributed tracing and end-to-end observability',
    ],
    challenges: [
      {
        title: 'Microservice Reliability',
        description:
          'The portal connects to 12+ backend microservices owned by different teams, each with varying reliability, response times, and error formats.',
        solution:
          'Built a unified API integration layer with automatic retry logic, exponential backoff, circuit breakers, and normalized error handling. Added request/response interceptors for consistent logging via OpenTelemetry.',
      },
      {
        title: 'Auth0 Integration with MTN ID',
        description:
          'MTN Ghana uses a custom identity provider (MTN ID) that needed to work seamlessly with Auth0 for OAuth 2.0 flows, session management, and role-based access.',
        solution:
          'Configured Auth0 as a federation broker with MTN ID as a custom social connection. Implemented silent token refresh, secure session persistence, and role-based route guards.',
      },
      {
        title: 'Launch Under Pressure',
        description:
          'The portal needed to launch within a tight timeline for a production telecom audience where downtime or bugs would impact millions of subscribers.',
        solution:
          'Prioritized a phased rollout strategy, implemented comprehensive error boundaries, and added feature flags for gradual capability exposure. Led the team through focused sprint cycles to hit the deadline.',
      },
    ],
    features: [
      'Dashboard with account summary: mobile accounts, broadband, orders, subscriptions',
      'Broadband management: view accounts, data usage, TurboNet and Fibre services',
      'Fibre request workflow: request new fibre, check availability, track requests',
      'Beneficiary management for account sharing',
      'Help center with searchable FAQs, how-to videos, and guidebooks',
      'Dark/light mode toggle',
      'Personal information and account settings',
      'Google Sign-In alongside phone-based MTN ID authentication',
    ],
    screenshots: [
      { src: '/screenshots/mtn/login.png', alt: 'MTN SSP Login', caption: 'MTN ID login with phone-based and Google authentication' },
      { src: '/screenshots/mtn/dashboard.png', alt: 'MTN SSP Dashboard', caption: 'Account dashboard showing mobile, broadband, orders, subscriptions, and loyalty points' },
      { src: '/screenshots/mtn/broadband.png', alt: 'MTN Broadband Accounts', caption: 'Broadband account management with search and TurboNet/Fibre filtering' },
      { src: '/screenshots/mtn/fibre.png', alt: 'MTN Fibre Requests', caption: 'Fibre request and relocation workflow with availability check' },
      { src: '/screenshots/mtn/beneficiaries.png', alt: 'MTN Beneficiaries', caption: 'Beneficiary management for account sharing' },
      { src: '/screenshots/mtn/help.png', alt: 'MTN Help Center', caption: 'Help center with searchable FAQs, how-to videos, and guidebooks' },
    ],
  },
  {
    slug: 'agritrack-africa',
    title: 'AgriTrack Africa Admin',
    subtitle: 'Super admin dashboard for a livestock and farm management platform',
    description:
      'A comprehensive super admin dashboard for AgriTrack Africa — a livestock and farm management system serving farmers across Ghana. Built as part of a monorepo alongside a React Native/Expo mobile app and NestJS REST API. The dashboard provides platform administrators with complete oversight of users, farms, animals, health records, financials, and more across 15 modules.',
    role: 'Fullstack Developer',
    timeline: '2025 – Present',
    company: 'AgriTrack Africa',
    liveUrl: 'https://app.agritrackafrica.com',
    tech: [
      'Next.js 16', 'React 19', 'TypeScript', 'Tailwind CSS v4', 'Recharts',
      'shadcn/ui', 'NestJS 11', 'TypeORM', 'PostgreSQL', 'Redis',
      'Bull Queues', 'Docker',
    ],
    highlights: [
      '16-page admin dashboard with role-gated access',
      '30+ REST API endpoints for cross-platform management',
      'Real-time analytics with interactive charts (Recharts)',
      'Complete user lifecycle: invite, role management, soft-delete with restore',
      'Notification broadcasting to all users or specific farms',
      'CSV data export across all modules',
    ],
    challenges: [
      {
        title: 'Cross-Platform Data Consistency',
        description:
          'The admin dashboard, mobile app, and API all needed to present consistent data for farms, animals, and financial records — even when the mobile app operates offline.',
        solution:
          'Designed the API with idempotent endpoints and conflict resolution strategies. Used TypeORM with careful transaction management and soft-delete patterns to maintain data integrity across all platforms.',
      },
      {
        title: 'Complex Module Architecture',
        description:
          'Managing 15 interconnected modules (Users, Farms, Animals, Health Records, Financials, Feed, Sales, Mortality, Weight Records, Breeding, Suppliers, Advisory Notes, Activity Logs, Notifications, System Health) with relationships between them.',
        solution:
          'Designed a modular NestJS architecture with clear domain boundaries. Each module has its own service, controller, and repository layer. Used TypeORM relations with eager/lazy loading strategies optimized per use case.',
      },
      {
        title: 'Real-Time Analytics at Scale',
        description:
          'Aggregating data across animals, farms, and financial transactions for dashboard charts while maintaining fast page loads.',
        solution:
          'Implemented Redis caching for expensive aggregation queries with Bull queues for background cache invalidation. Charts use Recharts with lazy data loading so the dashboard renders instantly while analytics populate.',
      },
    ],
    features: [
      'Platform overview dashboard with key metrics and interactive charts',
      'User management: invite via email, assign roles, soft-delete and restore',
      'Farm management: livestock, poultry, and mixed farm tracking',
      'Animal records: species tracking, health records, weight monitoring',
      'Financial module: income, expenses, net profit tracking with charts',
      'Feed management and sales tracking',
      'Breeding records and mortality reporting',
      'Supplier management and advisory notes',
      'Activity logs and system health monitoring',
      'Notification broadcasting to users or specific farms',
      'CSV export on every data view',
      'Dark mode, pagination, and search/filter throughout',
    ],
    screenshots: [
      { src: '/screenshots/ata/dashboard.png', alt: 'AgriTrack Dashboard', caption: 'Platform overview with user, farm, and animal counts, plus species distribution and financial charts' },
    ],
  },
];
