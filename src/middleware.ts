import { defineMiddleware } from 'astro:middleware'

export const onRequest = defineMiddleware(async (_, next) => next())
