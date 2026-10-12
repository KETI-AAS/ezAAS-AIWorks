"use client"

/**
 * Client-side AAS version store.
 *
 * Holds the AAS structure for each entity (model / dataset) as an ordered list
 * of versions (newest first). It is intentionally a module-level singleton so
 * the read-only viewer dialog on a detail page and the dedicated edit route
 * share the same in-session state across client navigation.
 *
 * This is mock persistence only. When a real backend is added, replace the
 * seed/add functions with API calls — the components consuming `useAasVersions`
 * do not need to change.
 */

import { useSyncExternalStore } from "react"

import type { TreeNode } from "./aas-types"

export type AasVersion = {
  version: string
  date: string
  author: string
  note: string
  tree: TreeNode
}

/** Metadata describing an existing registry version entry. */
export type SeedVersionMeta = {
  version: string
  date: string
  author: string
  changes: string
}

const store = new Map<string, AasVersion[]>()
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

/** Deep clone a tree so each version owns an independent, editable copy. */
export function cloneTree(node: TreeNode): TreeNode {
  return {
    ...node,
    semanticId: node.semanticId
      ? {
          ...node.semanticId,
          keys: node.semanticId.keys?.map((k) => ({ ...k })),
        }
      : undefined,
    children: node.children?.map(cloneTree),
  }
}

/** Compute the next version label by incrementing the trailing integer. */
export function nextVersionLabel(current: string): string {
  const match = current.match(/^(.*?)(\d+)$/)
  if (!match) return `${current}.1`
  const [, prefix, num] = match
  return `${prefix}${Number(num) + 1}`
}

/**
 * Seed an entity's versions once. `buildTree` is only invoked the first time an
 * entity is encountered, so parsing/mock-building happens a single time.
 */
export function ensureSeeded(
  entityId: string,
  buildTree: () => TreeNode,
  versionMeta: SeedVersionMeta[],
): void {
  if (store.has(entityId)) return

  const baseTree = buildTree()
  const metas =
    versionMeta.length > 0
      ? versionMeta
      : [{ version: "v1.0", date: "", author: "AI팀", changes: "초기 버전" }]

  const versions: AasVersion[] = metas.map((meta) => ({
    version: meta.version,
    date: meta.date,
    author: meta.author,
    note: meta.changes,
    tree: cloneTree(baseTree),
  }))

  store.set(entityId, versions)
}

export function getVersions(entityId: string): AasVersion[] {
  return store.get(entityId) ?? []
}

/** Prepend a new version (newest first) and notify subscribers. */
export function addVersion(
  entityId: string,
  tree: TreeNode,
  meta: { author: string; note: string },
): AasVersion {
  const existing = store.get(entityId) ?? []
  const latest = existing[0]
  const version = latest ? nextVersionLabel(latest.version) : "v1.0"
  const now = new Date().toISOString().slice(0, 10)
  const entry: AasVersion = {
    version,
    date: now,
    author: meta.author,
    note: meta.note,
    tree: cloneTree(tree),
  }
  store.set(entityId, [entry, ...existing])
  emit()
  return entry
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Subscribe to an entity's versions. Seeds lazily and synchronously on first
 * use so the first render already has data (no loading flash).
 */
export function useAasVersions(
  entityId: string,
  buildTree: () => TreeNode,
  versionMeta: SeedVersionMeta[],
): AasVersion[] {
  ensureSeeded(entityId, buildTree, versionMeta)
  return useSyncExternalStore(
    subscribe,
    () => store.get(entityId) ?? EMPTY,
    () => store.get(entityId) ?? EMPTY,
  )
}

const EMPTY: AasVersion[] = []
