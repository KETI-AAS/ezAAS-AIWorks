"use client"

import { LogOut, User } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { useAuth } from "@/components/auth/auth-provider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
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

export function SidebarAuth() {
  const { user, login, logout } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  function handleLogin() {
    const ok = login(email, password)
    if (ok) {
      toast.success(`${email.trim()}님 환영합니다`)
      setEmail("")
      setPassword("")
    } else {
      toast.error("이메일과 비밀번호를 입력해 주세요")
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (
      e.key === "Enter" &&
      !e.nativeEvent.isComposing &&
      e.keyCode !== 229
    ) {
      e.preventDefault()
      handleLogin()
    }
  }

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-2.5 text-left transition-colors hover:bg-sidebar-accent/70"
            />
          }
        >
          <Avatar size="sm">
            <AvatarFallback className="bg-primary/15 text-primary">
              {user.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-medium">{user.email}</span>
            <span className="text-xs text-muted-foreground">로그인됨</span>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-(--anchor-width)">
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
    <div className="flex flex-col gap-2.5 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <User className="size-4 text-primary" />
        로그인
      </div>
      <Input
        aria-label="이메일"
        type="email"
        placeholder="이메일"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <Input
        aria-label="비밀번호"
        type="password"
        placeholder="비밀번호"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <Button size="sm" className="w-full" onClick={handleLogin}>
        로그인
      </Button>
    </div>
  )
}
