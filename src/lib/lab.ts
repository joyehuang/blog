import type { CollectionEntry } from 'astro:content'

export type LabEntry = CollectionEntry<'lab'>
export type LabCategory = LabEntry['data']['category']

export const labCategoryOrder: LabCategory[] = [
  'layout',
  'typography',
  'css',
  'animation',
  'interaction',
  'component',
  'other'
]

export const labCategoryLabels = {
  zh: {
    all: '全部',
    layout: '布局',
    typography: '排版',
    css: 'CSS',
    animation: '动效',
    interaction: '交互',
    component: '组件',
    other: '其他'
  },
  en: {
    all: 'All',
    layout: 'Layout',
    typography: 'Typography',
    css: 'CSS',
    animation: 'Animation',
    interaction: 'Interaction',
    component: 'Component',
    other: 'Other'
  }
} as const

// Low-saturation category chips, mirroring the Notes index type chips so the
// two sibling sections read as one family (light + dark variants). `other`
// falls back to the semantic muted token.
export const labCategoryChip: Record<LabCategory, string> = {
  layout: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  typography: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  css: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  animation: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  interaction: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  component: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  other: 'bg-muted text-muted-foreground'
}

export function sortLabEntries(entries: LabEntry[]) {
  return [...entries].sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
}
