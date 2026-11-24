"use client"

import { LogIn, LogOut } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth/auth-provider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

export function AccountMenu() {
  const { user, login, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  function handleLogin(event: React.FormEvent) {
    event.preventDefault()
    const ok = login(email, password)
    if (ok) {
      toast.success(`${email.trim()}님 환영합니다`)
      setEmail("")
      setPassword("")
      setOpen(false)
    } else {
      toast.error("이메일과 비밀번호를 입력해 주세요")
    }
  }

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-muted"
              aria-label="계정 메뉴"
            />
          }
        >
          <Avatar size="sm">
            <AvatarFallback className="bg-primary/15 text-primary">
              {user.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-40 truncate text-sm font-medium lg:inline">{user.email}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              logout()
              toast.success("로그아웃되었습니다")
            }}
          >
            <LogOut />
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <LogIn data-icon="inline-start" />
        로그인
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>모델 허브 계정으로 로그인</DialogTitle>
            <DialogDescription>
              모델 허브(ezAAS) 계정으로 로그인하면 내 instance를 불러와 등록할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              이메일
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              비밀번호
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <Button type="submit" className="mt-1">
              로그인
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
