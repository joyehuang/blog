# Personal space guide

The `/workshop` preview includes a spatial guide and three explicitly labelled curated journeys.
Free-form AI journeys call `/api/workshop/guide`; they do not silently fall back to keyword search.

Configure the server with a provider supporting the Chat Completions tool-calling protocol:

```dotenv
WORKSHOP_AI_BASE_URL=https://your-provider.example/v1
WORKSHOP_AI_MODEL=your-model-id
WORKSHOP_AI_API_KEY=your-server-side-key
```

Put these in the project's ignored `.env.local` and restart `bun dev`. Keep credentials server-side;
never use `PUBLIC_` variables. The model must support `tools`, `tool_choice: required`, and tool results.
API shape follows the provider's [function-calling contract](https://developers.openai.com/api/docs/guides/function-calling).

Run `bun dev --host 127.0.0.1 --port 4328` and visit `/workshop` (without a trailing slash).
The previous Python static preview cannot execute this endpoint.

The guide searches published blog posts, notes, and the curated personal-content catalogue, reads
source text, then requests a 2–5-step journey. Only previously read, allowlisted source IDs can be
presented. All descriptions are rendered as text; URLs come from the site's content, never the model.
The browser moves the same content objects through the scene, retains three recent journeys as
context, provides previous/next and history navigation, and allows cancellation.

No provider was configured while implementing the guide. Curated journeys work locally. Provider
orchestration is covered with deterministic test transports; a live provider still needs verification.
`GET /api/workshop/guide` reports availability without exposing model credentials.

Before publishing this experimental endpoint, configure a platform-level request/spend limit. The
current same-origin check, 55-second timeout, six model rounds, and two concurrent requests are bounded
preview protections, not a distributed rate limiter. This route remains excluded from the sitemap.

Validation: `bun test`, `bun run check`, `bun run build:checked`; browser-check curated routes, source
dialogs, route history, missing-provider messaging, mobile layout, and reduced-motion preferences.
