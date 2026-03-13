---
title: TypeScript 实用类型备忘
date: 2025-11-10
updatedDate: 2026-01-05
tags: ['typescript', 'reference']
type: 'reference'
status: 'ready'
draft: false
---

## Pick & Omit

```typescript
type User = { id: string; name: string; email: string }
type UserPreview = Pick<User, 'id' | 'name'>
type UserWithoutEmail = Omit<User, 'email'>
```

## Partial & Required

```typescript
type PartialUser = Partial<User>  // 所有字段可选
type RequiredUser = Required<PartialUser>  // 所有字段必填
```

## Record

```typescript
type PageInfo = Record<string, { title: string; url: string }>
```

## 条件类型

```typescript
type NonNullable<T> = T extends null | undefined ? never : T
```

## 使用场景

在 Astro 项目中用 Pick 提取 frontmatter 字段
