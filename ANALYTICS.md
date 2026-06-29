# Analytics Events

This file is the tracking contract for the site. Keep event names stable so Vercel Analytics data stays comparable over time.

## Principles

- Use one event for one user intent, not one event for every implementation detail.
- Prefer `snake_case` event names.
- Name events as `surface_object_action` when possible.
- Put context in properties such as `section`, `target`, `method`, `href`, `slug`, and `percent`.
- Do not send personal data such as email, IP address, display name, or free-form user input.
- Keep property values flat: strings, numbers, booleans, or `null`.

## Common Properties

| Property  | Meaning                                                          | Examples                                                         |
| --------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| `section` | Page area or content group where the event happened.             | `profile_header`, `terminal`, `open_source`, `agent_popout`      |
| `target`  | Specific clicked or interacted object.                           | `profile`, `terminal_shell`, `feishu_link`, `Learn-Open-Harness` |
| `href`    | Link destination when the target is an anchor.                   | `https://github.com/joyehuang`                                   |
| `method`  | Interaction method when relevant.                                | `shell_click`, `keyboard_backtick`, `keyboard_activate`          |
| `command` | Terminal command name only, without arguments.                   | `help`, `chat`, `ls`                                             |
| `slug`    | Content identifier for articles, notes, talks, or archive items. | `20260517---agentonboardingguide`                                |
| `percent` | Progress threshold for reading or scroll events.                 | `50`, `75`, `90`                                                 |

## Current Events

### `home_terminal_open`

User opens the interactive terminal on the home page.

Properties:

- `section`: `terminal`
- `target`: `terminal_shell`
- `method`: `shell_click` | `keyboard_backtick` | `keyboard_activate` | `window_control`

Use this to measure whether the terminal is a real interactive entry point or only a visual element.

### `home_terminal_command`

User runs a command in the home page terminal.

Properties:

- `section`: `terminal`
- `target`: `terminal_shell`
- `command`: command name only, for example `help`, `chat`, `ls`

Do not send full raw commands because they may contain user-written text.

### `home_github_click`

User clicks a GitHub destination from the home page.

Properties:

- `section`: `profile_header` | `open_source`
- `target`: `profile` or repository name
- `href`: GitHub URL

Use this to compare top profile GitHub intent with project-specific GitHub intent.

### `home_agent_activity_click`

User interacts with the Agent activity popout on the home page.

Properties:

- `section`: `agent_popout`
- `target`: `feishu_link` | `pill_open` | `minimize` | `close`
- `href`: Feishu link when clicking the activity link

Use this to evaluate whether the popout drives activity interest or mostly gets dismissed.

### `home_cta_click`

User clicks a primary internal home page CTA.

Properties:

- `section`: `hero` | `about` | `blog` | `notes` | `talks`
- `target`: `contact` | `more_about` | `more_blogs` | `more_notes` | `latest_talk` | `all_talks`
- `href`: internal URL

Use this to understand which internal paths the home page sends readers toward.

### `home_external_click`

User clicks an external experience/project destination from the home page.

Properties:

- `section`: `experience`
- `target`: `playyy` | `atypica` | `aixcut` | `faishion`
- `href`: external URL

Use this to measure outbound interest in work/project links.

## Planned Events

These are not implemented yet. Add them when article and content analytics are instrumented.

### `article_read_progress`

User reaches a reading progress threshold on an article.

Properties:

- `slug`: article identifier
- `percent`: `50` | `75` | `90`

Use this for read-depth and completion-rate analysis.

### `article_external_link_click`

User clicks an external link inside an article.

Properties:

- `slug`: article identifier
- `section`: optional content section or heading id
- `target`: normalized link label or domain
- `href`: external URL

Use this to learn which references and outbound resources readers care about.

## Adding A New Event

1. Add the event to this file first.
2. Reuse existing properties before inventing new ones.
3. Keep the event name stable after deploy. If the meaning changes, create a new event.
4. Verify in production with DevTools Network by checking for `/_vercel/insights/event`.
