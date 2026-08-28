import './globals.css'
import { Providers } from '@/components/providers'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const metadataBase = new URL(appUrl.startsWith('http') ? appUrl : `https://${appUrl}`)

export const metadata = {
  metadataBase,
  title: {
    default: 'Quid',
    template: '%s | Quid'
  },
  description: 'Create a Quid pay link, receive USDC, and withdraw from your Circle-backed Arc wallet.',
  openGraph: {
    title: 'Quid',
    description: 'Personal USDC payment pages powered by Circle Wallets, Gateway, and Arc Testnet.',
    siteName: 'Quid',
    images: ['/brand/quid-nobackground.png']
  },
  icons: {
    icon: '/brand/quid-q.png'
  }
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfaff' },
    { media: '(prefers-color-scheme: dark)', color: '#08071a' }
  ]
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('quid-theme');
                const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                const theme = saved || preferred;
                document.documentElement.dataset.theme = theme;
                document.documentElement.classList.toggle('dark', theme === 'dark');
              } catch {}
            `
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
