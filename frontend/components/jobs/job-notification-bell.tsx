"use client"

import { Bell, CheckCircle2, Loader2, XCircle } from "lucide-react"

import { useBackgroundJobs } from "@/components/jobs/background-job-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type BackgroundJob, describeJob, formatRelativeTime } from "@/lib/background-jobs"

export function JobNotificationBell() {
  const { jobs, unreadCount, markAllRead } = useBackgroundJobs()

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) markAllRead()
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="알림" className="relative" />
        }
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white">
            {unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">알림</p>
          <p className="text-xs text-muted-foreground">백그라운드 작업 상태</p>
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {jobs.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              진행 중인 작업이 없습니다
            </p>
          ) : (
            jobs.map((job) => <JobRow key={job.id} job={job} />)
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function JobRow({ job }: { job: BackgroundJob }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/50">
      <JobStatusIcon status={job.status} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-medium">{describeJob(job)}</p>
        <p className="truncate text-xs text-muted-foreground">{job.title}</p>
        <p className="text-[11px] text-muted-foreground/70">{formatRelativeTime(job.updatedAt)}</p>
      </div>
    </div>
  )
}

function JobStatusIcon({ status }: { status: BackgroundJob["status"] }) {
  if (status === "running") {
    return <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
  }
  if (status === "completed") {
    return <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
  }
  return <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
}
