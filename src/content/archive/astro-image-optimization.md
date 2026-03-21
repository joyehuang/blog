---
title: Astro 图片优化技巧
description: 收集的一些 Astro 图片优化和性能相关的笔记
date: 2026-01-15
updatedDate: 2026-02-10
tags: ['astro', 'performance', 'images']
locale: zh
translationKey: astro-image-optimization
type: 'note'
status: 'in-progress'
draft: false
---

## Image 组件使用

- 使用 `<Image>` 组件自动优化
- Sharp service 比 Squoosh 性能更好
- 支持 webp/avif 格式自动转换

## 待研究

- [ ] lazy loading 策略
- [ ] 响应式图片最佳实践
- [ ] CDN 集成方案

## 参考资料

- [Astro Image docs](https://docs.astro.build/en/guides/images/)
- 项目中的实践：`astro.config.ts` 配置了 sharp service
