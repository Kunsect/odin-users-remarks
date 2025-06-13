export const SELECTORS = {
  tokenContainer: '.hidden.space-y-5.rounded-lg.bg-black.p-4.lg\\:block',
  userStats: '.left-0.top-0.flex.flex-grow.items-center.gap-2.bg-transparent',
  priceContainer: '.rounded-lg.border.border-odin-border.p-\\[10px\\].text-center',
  priceTitle: 'span.text-xxs.uppercase',
  priceElement: 'span.inline-flex.items-center.gap-1.text-primary span span[title]',
  holdersContainer: '.space-y-5.rounded-lg.bg-background-offset.p-4',
  tradeInfo: '.trade-info'
} as const

export const API = {
  BASE_URL: 'https://api.odin.fun/v1',
  BTC_DIVISOR: Math.pow(10, 8),
  API_MULTIPLIER: 1000
} as const

export const STORAGE_KEYS = {
  USER_REMARKS: 'userRemarks',
  LANGUAGE: 'language'
} as const

export const STYLES = {
  button:
    'inline-flex items-center text-sm justify-center gap-2 whitespace-nowrap rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-secondary-foreground shadow-sm px-3 py-2 bg-odin-blue font-bold hover:bg-odin-blue/80 h-8',
  tradeInfo: 'text-sm mt-1 pl-6 trade-info',
  skeleton: `
    @keyframes shimmer {
      0% { background-position: -200px 0; }
      100% { background-position: 200px 0; }
    }
    .skeleton {
      background: linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%);
      background-size: 200px 100%;
      animation: shimmer 1.5s infinite linear;
      border-radius: 4px;
    }
  `
} as const

export const COLORS = {
  profit: {
    positive: '#34D399',
    negative: '#F87171',
    positiveBg: 'rgba(52, 211, 153, 0.1)',
    negativeBg: 'rgba(248, 113, 113, 0.1)'
  },
  text: {
    primary: '#D1D5DB',
    secondary: '#9CA3AF',
    muted: '#6B7280'
  }
} as const
