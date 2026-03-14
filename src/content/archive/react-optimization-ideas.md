---
title: React 性能优化思路草稿
date: 2025-12-20
tags: ['react', 'performance', 'frontend']
type: 'draft'
status: 'incomplete'
draft: false
---

## 可能的优化点

- useMemo for expensive calculations
- React.memo for component memoization
- useCallback for stable function references
- Code splitting with lazy()
- Virtualization for long lists

## 疑问

- 什么时候 useMemo 真的有用？
- memo 的浅比较开销 vs 重渲染开销如何权衡？

## 资源

需要读：React 官方性能优化文档
