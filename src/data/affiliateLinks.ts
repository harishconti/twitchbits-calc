export const AFFILIATES = {
  streamlabs: {
    id: 'streamlabs-ultra', label: 'Streamlabs Ultra',
    url: 'https://streamlabs.com/ultra', // replaced with real Impact link in Task 18
    disclosure: 'We earn a commission when you sign up for Streamlabs Ultra.',
    cta: { primary: 'Upgrade your stream', alt: 'Start free trial' },
    placement: 'after-result' as const,
  },
  amazon: {
    id: 'amazon-streaming-gear', label: 'Amazon Associates',
    url: 'https://www.amazon.com',
    disclosure: 'As an Amazon Associate we earn from qualifying purchases.',
    cta: { primary: 'Shop streaming gear', alt: 'Browse gear' },
    placement: 'blog-only' as const,
  },
} as const;