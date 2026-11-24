"use client"

import { useCallback, useSyncExternalStore } from "react"

/**
 * The asset the user is currently working with (model + its linked dataset).
 * It carries across detail → inference → training so the user never has to
 * rediscover which AI they picked. Session-scoped UI state only.
 */
const KEY = "aiworks-current-model"
const EVENT = "aiworks-context-change"

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

function getSnapshot() {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setCurrentModel(modelId: string | null) {
  try {
    if (modelId) sessionStorage.setItem(KEY, modelId)
    else sessionStorage.removeItem(KEY)
  } catch {
    return
  }
  window.dispatchEvent(new Event(EVENT))
}

export function useCurrentModelId() {
  const id = useSyncExternalStore(subscribe, getSnapshot, () => null)
  const set = useCallback((next: string | null) => setCurrentModel(next), [])
  return [id, set] as const
}
