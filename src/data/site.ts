export type WorkVisual = 'roam' | 'alive' | 'procore' | 'chicks' | 'citibike' | 'workday';

interface SelectedWorkItemBase {
  title: string;
  blurb: string;
  href: string;
  size: 'feature' | 'compact';
  visual: WorkVisual;
}

export type SelectedWorkItem =
  | (SelectedWorkItemBase & {
      group: 'work';
      company: string;
      focus: string;
      date: string;
    })
  | (SelectedWorkItemBase & {
      group: 'project';
      external?: boolean;
    });

interface ExperienceItemBase {
  company: string;
  href: string;
  logo: 'roam' | 'procore' | 'workday';
  role: string;
  date: string;
  context: string;
}

export interface ExperienceTrack {
  label: string;
  title: string;
  glance: string;
  summary: string;
  highlights: string[];
  mediaGroup?: 'roam-marketplace' | 'reed' | 'agent-harness';
}

export type ExperienceItem = ExperienceItemBase & (
  | {
      tracks: ExperienceTrack[];
      bridge: string;
      summary?: never;
      highlights?: never;
    }
  | {
      tracks?: never;
      bridge?: never;
      summary: string;
      highlights: string[];
    }
);

export interface ArchiveItem {
  title: string;
  date: string;
  description: string;
  href?: string;
}

export const hero = {
  statement: 'I’m Jordan, a product engineer in New York. I build consumer products, developer tools, and AI agents.',
  support: 'For the last eight years, I’ve worked across product, design, frontend, backend, and analytics. Outside work, I make iPhone apps and small web projects.',
};

export const selectedWork: SelectedWorkItem[] = [
  {
    title: 'Product engineering at Roam',
    company: 'Roam',
    focus: 'Product engineering',
    date: '2025—now',
    blurb: 'Work across a home-buying marketplace and its AI agent: research, chat and search interfaces, backend tools, analytics, and evals.',
    href: '/about#roam',
    group: 'work',
    size: 'feature',
    visual: 'roam',
  },
  {
    title: 'Alive Still',
    blurb: 'A daily safety check-in for people who live alone. Miss the window and it texts the people you chose.',
    href: 'https://alivestill.app',
    external: true,
    group: 'project',
    size: 'feature',
    visual: 'alive',
  },
  {
    title: 'Developer platform at Procore',
    company: 'Procore',
    focus: 'Developer platform',
    date: '2021—2025',
    blurb: 'The deployment and credential tools behind hundreds of engineers’ daily work.',
    href: '/about#procore',
    group: 'work',
    size: 'compact',
    visual: 'procore',
  },
  {
    title: 'Chicks of NYC',
    blurb: 'A map and ranking of chicken wings we actually ate. The data pipeline is more serious than the premise.',
    href: 'https://chicksofnyc.com',
    external: true,
    group: 'project',
    size: 'compact',
    visual: 'chicks',
  },
  {
    title: 'Citi Bike Wrapped',
    blurb: 'A personal year in review for your Citi Bike rides. About three weeks after I posted mine on Reddit, Citi Bike released its own in-app recap.',
    href: 'https://citibikewrapped.com',
    external: true,
    group: 'project',
    size: 'compact',
    visual: 'citibike',
  },
  {
    title: 'Release tools at Workday',
    company: 'Workday',
    focus: 'Release tools',
    date: '2018—2021',
    blurb: 'Tools that made tests easier to find, releases less painful, and incident work a little less manual.',
    href: '/about#workday',
    group: 'work',
    size: 'feature',
    visual: 'workday',
  },
];

export const experience: ExperienceItem[] = [
  {
    company: 'Roam',
    href: 'https://www.withroam.com',
    logo: 'roam',
    role: 'Product Engineer',
    date: 'May 2025—now',
    context: 'Joined just after Roam’s $11.5M Series A as the third engineer on a four-person team. Backed by Khosla Ventures and Founders Fund; early investors included Fifth Wall co-founder Brendan Wallace.',
    bridge: 'I work across the marketplace, Reed, and the agent tooling behind both.',
    tracks: [
      {
        label: '01 · Product engineering',
        title: 'Roam marketplace',
        glance: 'Search, offers, onboarding, and the tools behind them.',
        summary: 'I build the core product buyers use to find homes, understand their financing, and move through an offer.',
        highlights: [
          'Shipped search, offer, onboarding, and growth flows, plus the internal tools that support them.',
          'Worked end to end across product decisions, interface design, backend systems, analytics, rollout, and iteration.',
        ],
        mediaGroup: 'roam-marketplace',
      },
      {
        label: '02 · AI product',
        title: 'Reed, the AI realtor',
        glance: 'Buyer conversations, home research, pricing, and evals.',
        summary: 'I’m one of two lead engineers building Reed as both a customer product and an AI system: the conversation, the research and pricing tools behind it, and the checks that show when it fails.',
        highlights: [
          'Built streaming chat and tool-call interfaces, multi-tool home research and pricing flows, and vision-model photo analysis.',
          'Built evals and conversation analytics to catch regressions, find drop-off, and guide product changes.',
        ],
        mediaGroup: 'reed',
      },
      {
        label: '03 · Agent systems',
        title: 'Agent harness',
        glance: 'Parallel coding agents with review, recovery, and approval gates.',
        summary: 'I built the internal agent harness our team uses to plan, dispatch, and supervise parallel coding agents.',
        highlights: [
          'Added cross-model review, crash recovery, and human approval gates so parallel work stays observable and recoverable.',
        ],
        mediaGroup: 'agent-harness',
      },
    ],
  },
  {
    company: 'Procore',
    href: 'https://www.procore.com',
    logo: 'procore',
    role: 'Software Engineer → Senior Software Engineer',
    date: 'May 2021—May 2025',
    context: 'Four years building internal products for a 600+ person engineering organization, with a promotion to Senior Software Engineer.',
    summary: 'I owned deployment and credential tools from user research and roadmap decisions through production React and Rails work.',
    highlights: [
      'Owned the deployment platform across ASG, Kubernetes, and Capistrano workflows.',
      'Built self-service credential tooling for more than 80 teams and CI/CD patterns that cut new-service setup from days to hours.',
      'Mentored engineers and raised accessibility, performance, and design-system standards across internal tools.',
    ],
  },
  {
    company: 'Workday',
    href: 'https://www.workday.com',
    logo: 'workday',
    role: 'Associate DevOps / Release Engineer → Senior Associate Developer',
    date: 'Aug 2018—May 2021',
    context: 'Early in my career, I led conversations with business and engineering leaders around an org-wide release project.',
    summary: 'I built the tools, release workflows, and rollout plans—then worked directly with teams to make sure they were useful.',
    highlights: [
      'Built a code-test finder that saved developers about three hours a week.',
      'Cut release timelines by 50% by rebuilding CI/CD and release workflows with CircleCI, Docker, and Git Flow.',
      'Built incident-response and deployment tooling, then drove adoption through demos, documentation, and hands-on pairing.',
    ],
  },
];

export const education = {
  school: 'Santa Clara University',
  degree: 'BS Computer Science · Studio Art minor (Graphic Design)',
  date: '2018',
  campusRoles: ['Student Ambassador (campus tour guide)', 'IT Technician'],
  campusRoleDate: 'Sophomore—senior year',
};

export const toolkit = [
  'React',
  'TypeScript',
  'Elixir / Phoenix',
  'Python',
  'Swift',
  'PostgreSQL',
  'AWS',
  'AI agents & evals',
  'CI/CD',
];

export const projectArchive: ArchiveItem[] = [
  {
    title: 'Alive Still',
    date: '2026',
    description: 'A daily safety check-in for people who live alone.',
    href: 'https://alivestill.app',
  },
  {
    title: 'Chicks of NYC',
    date: '2025—',
    description: 'A map and ranking of chicken wings we actually ate.',
    href: 'https://chicksofnyc.com',
  },
  {
    title: 'Citi Bike Wrapped',
    date: '2026',
    description: 'A personal year in review for your Citi Bike rides. About three weeks after I posted mine on Reddit, Citi Bike released its own in-app recap.',
    href: 'https://citibikewrapped.com',
  },
  {
    title: 'wimdy',
    date: '2026',
    description: 'Checks the weather against what you actually want to do outside.',
    href: 'https://wimdy.io',
  },
  {
    title: 'Roast My Friend',
    date: '2026',
    description: 'A joke that escaped the group chat.',
    href: 'https://roastmyfriend.vercel.app',
  },
  {
    title: 'blumblumblum',
    date: '2022—',
    description: 'My hand-rolled version of Linktree, Beacons, and lnk.bio.',
    href: 'https://blumblumblum.com',
  },
  {
    title: 'Photo archive',
    date: 'ongoing',
    description: 'Travel photographs from a period when I carried a much bigger camera.',
    href: 'https://blumblumblum-gallery.vercel.app/',
  },
];

export const about = {
  title: 'I like making things. I like making them look good, too.',
  paragraphs: [
    'I studied computer science and studio art so I could do both. For the last eight years, I’ve worked across product, design, frontend, backend, and the systems behind them.',
    'I like following an idea from the first sketch to something people actually use. Sometimes that’s a consumer product, sometimes it’s an internal tool, and sometimes it’s a side project I wanted for myself.',
    'I live in New York. Outside work I ride bikes, make small apps, take photos, and run a chicken-wing site with friends.',
  ],
};

export const social = [
  { label: 'Email', href: 'mailto:jordanblum16@gmail.com' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/jordanblum1' },
  { label: 'GitHub', href: 'https://github.com/jordanblum1' },
  { label: 'blumblumblum', href: 'https://blumblumblum.com' },
];
