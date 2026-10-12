"use client"

import { Boxes, Brain, Database, FilePlus2, Home, Layers, Link2, Menu, ShieldCheck, Sparkles } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { SidebarAuth } from "@/components/auth/sidebar-auth"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const nav = [
  { label: "Home", href: "/", icon: Home },
  { label: "AI Asset Pairs", href: "/pairs", icon: Link2 },
  { label: "AI Dataset", href: "/datasets", icon: Database },
  { label: "AI Model", href: "/models", icon: Boxes },
  { label: "AI Training", href: "/training", icon: Brain, badge: "New" },
  { label: "AI 자산 등록", href: "/register", icon: FilePlus2 },
  { label: "Admin", href: "/admin", icon: ShieldCheck },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <Badge className="h-5 shrink-0 rounded-full border-primary/20 bg-primary/10 px-2 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {item.badge}
              </Badge>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-1">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Layers className="size-5" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold">Model Registry</span>
        <span className="text-xs text-muted-foreground">AI 모델 탐색 플랫폼</span>
      </span>
    </Link>
  )
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="pt-2">
        <Brand />
      </div>
      <div className="flex-1">
        <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
          메뉴
        </p>
        <NavLinks onNavigate={onNavigate} />
      </div>
      <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-primary" />
          현장 친화 AI
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          전문 지식 없이도 모델의 목적과 결과를 직관적으로 이해할 수 있습니다.
        </p>
      </div>
      <SidebarAuth />
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-svh bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar md:block">
        <SidebarBody />
      </aside>

      <div className="flex min-h-svh flex-col md:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon" className="md:hidden" aria-label="메뉴 열기" />
                }
              >
                <Menu data-icon="inline-start" />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">메뉴</SheetTitle>
                <SidebarBody onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="text-sm font-medium text-muted-foreground md:hidden">
              Model Registry
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
