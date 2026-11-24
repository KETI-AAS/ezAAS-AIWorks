"use client"

import {
  Boxes,
  Brain,
  ChevronRight,
  Database,
  FilePlus2,
  Home,
  Link2,
  Menu,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { AccountMenu } from "@/components/auth/sidebar-auth"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { getAssetPair, getDataset, getModel } from "@/lib/registry-data"
import { cn } from "@/lib/utils"

type NavItem = { label: string; hint: string; href: string; icon: LucideIcon }
type NavGroup = { label: string; items: NavItem[] }

const navGroups: NavGroup[] = [
  {
    label: "시작",
    items: [
      { label: "홈", hint: "서비스 개요", href: "/", icon: Home },
      { label: "자산 등록", hint: "instance + 파일 연결", href: "/register", icon: FilePlus2 },
    ],
  },
  {
    label: "탐색 · 실행",
    items: [
      { label: "연계 자산", hint: "데이터 ↔ 모델 조합", href: "/pairs", icon: Link2 },
      { label: "모델", hint: "상세 · 추론 실행", href: "/models", icon: Boxes },
      { label: "데이터셋", hint: "학습 데이터 정보", href: "/datasets", icon: Database },
    ],
  },
  {
    label: "학습",
    items: [{ label: "AI 학습", hint: "내 데이터로 추가 학습", href: "/training", icon: Brain }],
  },
  {
    label: "관리",
    items: [{ label: "관리자", hint: "AAS · 사용 현황", href: "/admin", icon: ShieldCheck }],
  },
]

const sectionLabels: Record<string, string> = {
  register: "자산 등록",
  pairs: "연계 자산",
  models: "모델",
  datasets: "데이터셋",
  training: "AI 학습",
  admin: "관리자",
  deploy: "추론 실행",
  edit: "AAS 수정",
}

function useBreadcrumb(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  const crumbs: { label: string; href: string }[] = []
  segments.forEach((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/")
    const parent = segments[index - 1]
    let label = sectionLabels[segment] ?? segment
    if (parent === "models") label = getModel(segment)?.name ?? segment
    if (parent === "datasets") label = getDataset(segment)?.name ?? segment
    if (parent === "pairs") label = getAssetPair(segment)?.title ?? segment
    crumbs.push({ label, href })
  })
  return crumbs
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-6" aria-label="주 메뉴">
      {navGroups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="px-3 pb-1 font-mono text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/45">
            {group.label}
          </p>
          {group.items.map((item) => {
            const active = isActive(pathname, item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2 transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                {active && (
                  <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-sidebar-primary" aria-hidden="true" />
                )}
                <Icon className={cn("size-4 shrink-0", active && "text-sidebar-primary")} />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="truncate text-[11px] text-sidebar-foreground/45">{item.hint}</span>
                </span>
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2">
      <span className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary font-mono text-sm font-bold text-sidebar-primary-foreground">
        AW
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-sidebar-foreground">ezAAS AI Works</span>
        <span className="text-[11px] text-sidebar-foreground/50">제조 AI 탐색 · 실행 · 학습</span>
      </span>
    </Link>
  )
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-8 bg-sidebar p-4 text-sidebar-foreground">
      <div className="pt-2">
        <Brand />
      </div>
      <div className="flex-1 overflow-y-auto">
        <NavLinks onNavigate={onNavigate} />
      </div>
      <div className="rounded-md border border-sidebar-border p-3">
        <p className="text-xs font-medium text-sidebar-foreground">작업 흐름</p>
        <p className="mt-1 text-[11px] leading-relaxed text-sidebar-foreground/55">
          {"등록 → 검증 → 탐색 → 추론 → 학습 순서로 자산을 이어서 활용할 수 있습니다."}
        </p>
      </div>
    </div>
  )
}

function TopBreadcrumb() {
  const pathname = usePathname()
  const crumbs = useBreadcrumb(pathname)

  return (
    <nav aria-label="현재 위치" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        <li className="shrink-0">
          <Link
            href="/"
            className={cn(
              "transition-colors hover:text-foreground",
              crumbs.length === 0 ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            홈
          </Link>
        </li>
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1
          return (
            <li key={crumb.href} className="flex min-w-0 items-center gap-1.5">
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden="true" />
              {last ? (
                <span aria-current="page" className="truncate font-medium text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="truncate text-muted-foreground transition-colors hover:text-foreground">
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  if (pathname?.startsWith("/concepts")) return <>{children}</>

  return (
    <div className="min-h-svh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-sidebar-border md:block">
        <SidebarBody />
      </aside>

      <div className="flex min-h-svh flex-col md:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/90 px-4 backdrop-blur-md md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="메뉴 열기" />}
              >
                <Menu data-icon="inline-start" />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-sidebar-border p-0">
                <SheetTitle className="sr-only">메뉴</SheetTitle>
                <SidebarBody onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <TopBreadcrumb />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
