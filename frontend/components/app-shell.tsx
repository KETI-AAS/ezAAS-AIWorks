"use client"

import { LogIn, LogOut, Menu, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { getDataset, getModel } from "@/lib/registry-data"
import { cn } from "@/lib/utils"
import { useCurrentModelId } from "@/lib/works/work-context"

const NAV = [
  { label: "홈", href: "/", match: (p: string) => p === "/" },
  {
    label: "AI 찾아보기",
    href: "/models",
    match: (p: string) => p.startsWith("/models") || p.startsWith("/datasets") || p.startsWith("/pairs"),
  },
  { label: "자산 등록", href: "/register", match: (p: string) => p.startsWith("/register") || p.startsWith("/v2") },
  { label: "내 데이터로 학습", href: "/training", match: (p: string) => p.startsWith("/training") },
]

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="AI Works 홈">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        AW
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[15px] font-bold tracking-tight">AI Works</span>
        <span className="text-xs text-muted-foreground">제조 AI 체험 공간</span>
      </span>
    </Link>
  )
}

function AccountButton() {
  const { user, login, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden flex-col text-right leading-tight lg:flex">
          <span className="text-xs text-muted-foreground">Model Hub 연결됨</span>
          <span className="text-sm font-medium">{user.email}</span>
        </span>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut aria-hidden className="size-4" />
          로그아웃
        </Button>
      </div>
    )
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <LogIn aria-hidden className="size-4" />
        Model Hub 로그인
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Model Hub 계정으로 로그인</DialogTitle>
            <DialogDescription>
              로그인하면 Model Hub에 올린 내 instance를 AI Works에서 바로 불러올 수 있어요. (데모: 아무 값이나 입력하면
              로그인됩니다)
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (login(email, password)) {
                setOpen(false)
                setError("")
              } else setError("이메일과 비밀번호를 모두 입력해 주세요.")
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              이메일
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              비밀번호
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="h-11">
              로그인
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Keeps the chosen model + dataset visible while the user moves between screens. */
function ContextRibbon({ pathname }: { pathname: string }) {
  const [modelId, setModelId] = useCurrentModelId()
  const model = modelId ? getModel(modelId) : undefined
  const hidden = pathname === "/" || pathname.startsWith("/admin") || pathname.startsWith("/register") || pathname.startsWith("/v2")
  if (!model || hidden) return null
  const dataset = getDataset(model.datasetId)

  const links = [
    { label: "소개", href: `/models/${model.id}` },
    { label: "추론 해보기", href: `/models/${model.id}/deploy` },
    { label: "추가 학습", href: `/training?model=${model.id}` },
  ]

  return (
    <div className="border-b border-border bg-secondary/60">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 md:px-8">
        <span className="text-sm text-muted-foreground">지금 살펴보는 AI</span>
        <span className="flex min-w-0 items-center gap-2.5">
          <Image src={model.image || "/placeholder.svg"} alt="" width={28} height={28} className="size-7 rounded-md object-cover" />
          <span className="truncate text-[15px] font-semibold">{model.name}</span>
          {dataset ? <span className="hidden truncate text-sm text-muted-foreground sm:inline">+ {dataset.name}</span> : null}
        </span>
        <nav aria-label="현재 AI 바로가기" className="flex items-center gap-1 md:ml-auto">
          {links.map((l) => {
            const active = pathname === l.href.split("?")[0]
            return (
              <Link
                key={l.label}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium",
                  active ? "bg-card text-foreground shadow-sm" : "text-primary hover:bg-card/70",
                )}
              >
                {l.label}
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setModelId(null)}
            className="ml-1 rounded-md p-1.5 text-muted-foreground hover:bg-card/70 hover:text-foreground"
            aria-label="현재 AI 선택 해제"
          >
            <X aria-hidden className="size-4" />
          </button>
        </nav>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/"
  const [menuOpen, setMenuOpen] = useState(false)

  if (pathname.startsWith("/concepts")) return <>{children}</>

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-8 px-4 md:px-8">
          <Brand />
          <nav aria-label="주 메뉴" className="hidden h-full items-stretch gap-1 md:flex">
            {NAV.map((item) => {
              const active = item.match(pathname)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center px-3 text-[15px] font-medium transition-colors",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                  {active ? <span aria-hidden className="absolute inset-x-3 bottom-0 h-[3px] rounded-t bg-primary" /> : null}
                </Link>
              )
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/admin"
              className={cn(
                "hidden rounded-md px-2.5 py-1.5 text-sm md:inline-flex",
                pathname.startsWith("/admin") ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              관리
            </Link>
            <AccountButton />
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon" className="md:hidden" aria-label="메뉴 열기">
                    <Menu className="size-5" />
                  </Button>
                }
              />
              <SheetContent side="right" className="w-72 p-6">
                <SheetTitle className="mb-4">메뉴</SheetTitle>
                <nav aria-label="모바일 메뉴" className="flex flex-col gap-1">
                  {[...NAV, { label: "관리", href: "/admin", match: (p: string) => p.startsWith("/admin") }].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "rounded-lg px-3 py-3 text-base font-medium",
                        item.match(pathname) ? "bg-secondary text-primary" : "text-foreground hover:bg-muted",
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <ContextRibbon pathname={pathname} />
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-1 px-4 py-6 text-sm text-muted-foreground md:flex-row md:justify-between md:px-8">
          <span>AI Works · Model Hub 연계 제조 AI 체험 공간</span>
          <span>이 화면의 추론·검증·학습 결과는 데모용 예시이며 실제 서버에서 처리되지 않습니다.</span>
        </div>
      </footer>
    </div>
  )
}
