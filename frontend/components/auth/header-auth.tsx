"use client"

import { LogIn, LogOut } from "lucide-react"
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

/**
 * Compact login control for the top-right header.
 *
 * Authentication happens on the external "ezModelHub" platform, so ezAAS Works
 * never collects email/password itself. The button only kicks off the redirect
 * flow — wire the real destination in `startExternalLogin` below.
 */
export function HeaderAuth() {
  const { user, logout } = useAuth()

  function startExternalLogin() {
    // TODO: Redirect to the ezModelHub login (SSO / OAuth) once the URL is available.
    // Example: window.location.href = process.env.NEXT_PUBLIC_EZMODELHUB_LOGIN_URL
    toast.info("ezModelHub 로그인 연결 예정입니다")
  }

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-border bg-card px-1.5 py-1 pr-3 text-left transition-colors hover:bg-accent"
            />
          }
        >
          <Avatar size="sm">
            <AvatarFallback className="bg-primary/15 text-primary">
              {user.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">
            {user.email}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
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
    <Button size="sm" onClick={startExternalLogin}>
      <LogIn data-icon="inline-start" />
      로그인
    </Button>
  )
}
