import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist_Mono, IBM_Plex_Sans_KR } from 'next/font/google'
import './globals.css'

import { AppShell } from '@/components/app-shell'
import { AuthProvider } from '@/components/auth/auth-provider'
import { RefreshLoadingOverlay } from '@/components/refresh-loading-overlay'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

const plexSans = IBM_Plex_Sans_KR({
  variable: '--font-plex',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  preload: false,
})
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'AI Works — 제조 현장을 위한 AI 탐색·실행·학습 플랫폼',
  description:
    '모델 허브의 instance와 실제 모델·데이터 파일을 등록하고, AI를 탐색하고 실행해 보며, 내 데이터로 자동 전처리와 학습까지 이어가는 제조 AI 플랫폼입니다.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9fafb' },
    { media: '(prefers-color-scheme: dark)', color: '#16191d' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ko"
      className={`${plexSans.variable} ${geistMono.variable} bg-background`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              const navigation = performance.getEntriesByType('navigation')[0];
              const isReload = navigation?.type === 'reload' || performance.navigation?.type === 1;
              if (!isReload) return;
              const root = document.documentElement;
              root.dataset.refreshing = 'true';
              root.dataset.refreshStartedAt = String(performance.now());
              window.setTimeout(() => {
                delete root.dataset.refreshing;
                delete root.dataset.refreshStartedAt;
              }, 5000);
            })();`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <RefreshLoadingOverlay />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
