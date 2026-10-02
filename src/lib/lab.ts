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

// Category names carry meaning; chips use the same semantic surface in both themes.
export const labCategoryChip: Record<LabCategory, string> = {
  layout: 'bg-muted text-muted-foreground',
  typography: 'bg-muted text-muted-foreground',
  css: 'bg-muted text-muted-foreground',
  animation: 'bg-muted text-muted-foreground',
  interaction: 'bg-muted text-muted-foreground',
  component: 'bg-muted text-muted-foreground',
  other: 'bg-muted text-muted-foreground'
}

export function sortLabEntries(entries: LabEntry[]) {
  return [...entries].sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
}
