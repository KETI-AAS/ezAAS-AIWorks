import Link from "next/link"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: "홈" },
  { href: "/pairs", label: "탐색" },
  { href: "/v2/register", label: "내 자산" },
  { href: "/models", label: "추론 실행" },
  { href: "/training", label: "AI 학습" },
  { href: "/admin", label: "관리" },
]

export function TopNav({ active }: { active: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center gap-8 px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary font-mono text-xs font-semibold text-primary-foreground">
            AW
          </span>
          <span className="text-sm font-semibold">AI Works</span>
        </Link>
        <nav aria-label="주요 메뉴" className="hidden h-full items-stretch md:flex">
          {NAV.map((item) => {
            const isActive = item.href === active
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center border-b-2 px-4 text-sm transition-colors",
                  isActive
                    ? "border-primary font-semibold text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="hidden items-center gap-2 text-muted-foreground sm:flex">
            <span className="size-2 rounded-full bg-success" aria-hidden />
            Model Hub 연결됨
          </span>
          <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
            김
          </span>
        </div>
      </div>
    </header>
  )
}
