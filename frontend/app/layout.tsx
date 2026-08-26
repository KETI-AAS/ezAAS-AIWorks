import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

import { AppShell } from '@/components/app-shell'
import { AuthProvider } from '@/components/auth/auth-provider'
import { RefreshLoadingOverlay } from '@/components/refresh-loading-overlay'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'AI Model Registry — 제조 현장을 위한 AI 모델 탐색 플랫폼',
  description:
    '제조 현장 엔지니어가 AI 모델을 쉽게 탐색하고 활용할 수 있는 AI Model Registry. 모델의 목적, 학습 데이터, 결과, 활용처를 직관적으로 이해하세요.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1d24' },
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
      className={`${geistSans.variable} ${geistMono.variable} bg-background`}
      suppressHydrationWarning
    >
      <head>
        <style>{`html[data-refreshing='true'] #refresh-loading-overlay { display: flex; }`}</style>
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
