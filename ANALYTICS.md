# Analytics Events

This file is the tracking contract for the site. Check it before adding,
renaming, or changing Vercel Analytics events.

The site uses Vercel Analytics only. Do not add another analytics provider
unless the project explicitly decides to do that later.

## Tracking Boundary

Use Vercel Analytics Pages for routing questions:

- Which pages get traffic.
- Whether `/blog`, `/talks`, `/projects`, `/contact`, `/en/*`, or individual
  article pages are visited.
- Whether English pages have natural traffic.

Use Vercel Analytics Events only for behavior Pages cannot answer:

- In-page interactions that do not necessarily route.
- External exits such as GitHub, project sites, decks, videos, and docs.
- Reveals, hovers, or focus states that expose contact or sponsorship info.
- Terminal commands and terminal-driven navigation.
- Activity-specific intent such as Agent competition clicks or Talk join intent.

Do not track ordinary internal navigation as an event if the destination pageview
already answers the question. Examples to avoid:

- `more_blogs_click`
- `more_talks_click`
- `blog_card_click`
- `tag_click`
- `back_click`
- Generic header nav clicks

The rule of thumb:

- Pages answer "where did the visitor go?"
- Events answer "what did the visitor do that pageviews cannot see?"

## Naming Rules

- Use `snake_case`.
- Prefer names that describe a stable user intent, not current UI text.
- Do not include the page name unless the behavior is truly page-specific.
- Avoid generic names such as `button_click`, `cta_click`, or `link_click`.
- Keep event names stable after deploy. If meaning changes, create a new event.
- Put variable context in properties, not in the event name.

Good:

- `terminal_open`
- `terminal_command`
- `github_link_click`
- `agent_competition_click`
- `contact_method_reveal`

Bad:

- `home_cta_click`
- `more_blogs_click`
- `click_green_button`
- `talks_page_button_click`

## Common Properties

Keep properties flat: strings, numbers, booleans, or `null`. Do not send
personal data such as email addresses, IP addresses, display names, full command
input, comment text, search text, or free-form user input.

| Property           | Meaning                                                | Examples                                                                   |
| ------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| `locale`           | Current site locale.                                   | `zh`, `en`                                                                 |
| `page`             | Current pathname.                                      | `/`, `/en`, `/contact`, `/talks`                                           |
| `surface`          | UI area where the interaction happened.                | `home_profile`, `agent_popout`, `projects`, `article_inline`               |
| `section`          | Content section when useful.                           | `open_source`, `programs`, `sponsorship`                                   |
| `target`           | Specific interacted object.                            | `profile`, `repo`, `wechat`, `pill`                                        |
| `action`           | Interaction action.                                    | `click`, `reveal`, `close`, `minimize`, `external_link`                    |
| `method`           | Interaction method.                                    | `shell_click`, `keyboard_backtick`, `hover`, `focus`                       |
| `href`             | Destination for anchors.                               | `https://github.com/joyehuang`                                             |
| `destination_type` | Normalized destination kind.                           | `internal`, `external`, `github`, `mailto`, `doc`, `video`                 |
| `command`          | Terminal command name only.                            | `help`, `open`, `mail`, `connect`                                          |
| `command_result`   | Safe terminal outcome bucket.                          | `success`, `unknown_command`, `navigation`, `external_open`, `mailto_open` |
| `repo`             | Repository name for GitHub clicks.                     | `Learn-Open-Harness`, `interview-prep`                                     |
| `project`          | Project identifier for project clicks.                 | `atypica`, `aixcut`, `prepwise`                                            |
| `team`             | Agent competition team identifier.                     | `game-agent`, `rss-agent`                                                  |
| `link_type`        | Project link type.                                     | `site`, `github`, `doc`, `release`                                         |
| `method_name`      | Contact or payment method.                             | `wechat`, `qq_group`, `wechat_pay`, `alipay`                               |
| `article_slug`     | Article identifier for article-scoped events.          | `20260517---agentonboardingguide`                                          |
| `episode`          | Talk episode number.                                   | `1`, `2`                                                                   |
| `resource`         | Talk or article resource type.                         | `deck`, `video`, `record`, `slide`                                         |
| `source`           | How the surface was reached when relevant.             | `first_visit`, `replay`                                                    |
| `duration_ms`      | Elapsed interaction time in milliseconds.              | `4200`, `9300`                                                             |
| `time_to_cta_ms`   | Elapsed time from surface start to CTA view.           | `3600`, `4100`                                                             |
| `played`           | Whether the visitor interacted with a playful surface. | `true`, `false`                                                            |
| `interactions`     | Low-cardinality interaction burst count.               | `1`, `3`                                                                   |

Use `null` for unavailable optional properties rather than inventing placeholders.

## Target Event Contract

These are the intended events for the site. Some may not be implemented yet.
When implementing them, update the "Implementation Status" section below.

### `terminal_open`

User opens the interactive terminal.

Required properties:

- `locale`: `zh` | `en`
- `page`: current pathname
- `surface`: `home_terminal` | `dev_mode`
- `method`: `shell_click` | `keyboard_backtick` | `keyboard_activate` | `window_control`
- `target`: `terminal_shell`

Use this to measure whether the terminal is a real interactive entry point or
only a visual element.

### `terminal_command`

User runs a command in the terminal.

Required properties:

- `locale`: `zh` | `en`
- `page`: current pathname
- `surface`: `terminal`
- `target`: `terminal_shell`
- `command`: command name only, for example `help`, `open`, `mail`, `connect`
- `command_result`: safe bucket, not raw command text
- `destination_type`: optional destination bucket for commands that open something

Never send full raw terminal input because it may contain user-written text.

### `github_link_click`

User clicks a GitHub destination from any meaningful surface.

Required properties:

- `locale`: `zh` | `en`
- `page`: current pathname
- `surface`: `home_profile` | `home_open_source` | `about_social` | `projects` | `terminal_contact` | `footer`
- `target`: `profile` | `repo`
- `repo`: repo name when `target` is `repo`, otherwise `null`
- `href`: GitHub URL

Use this to understand whether visitors continue from the site to GitHub, and
from which surface.

### `agent_competition_click`

User interacts with the Agent competition surface.

Required properties:

- `locale`: `zh` | `en`
- `page`: current pathname
- `surface`: `agent_popout` | `agent_pill` | `projects`
- `action`: `external_link` | `close` | `minimize` | `pill_open`
- `href`: Feishu/doc URL for external link actions, otherwise `null`

Use this to compare real activity interest with dismissals.

### `agent_team_signup`

User interacts with the Agent competition team signup board (`/agent-teams`).

Required properties:

- `locale`: `zh` | `en`
- `page`: `/agent-teams`
- `surface`: `agent_teams`
- `action`: `open` | `submit`
- `team`: team identifier, for example `game-agent`

`open` fires when a visitor opens a team's signup form; `submit` fires on a
successful signup. Never send the submitted nickname, contact, or note — they
are personal data. Use this to see which topics attract real signup intent.

### `intro_start`

Home page entrance animation starts.

Required properties:

- `locale`: `zh` | `en`
- `page`: `/` | `/en`
- `surface`: `intro_overlay`
- `target`: `animation`
- `source`: `first_visit` | `replay`
- `variant`: `focus` | `line` | `jojo`
- `trigger`: `first_visit` | `url` | `picker` | `event` | `replay`

Use this to measure how many visitors actually see the intro animation,
separate from repeat visitors where the versioned localStorage gate hides it.

### `intro_complete`

The entrance animation finishes and the real home page becomes interactive.

Required properties:

- `locale`: `zh` | `en`
- `page`: `/` | `/en`
- `surface`: `intro_overlay`
- `target`: `content`
- `source`: `first_visit` | `replay`
- `variant`: `focus` | `line` | `jojo`
- `trigger`: `first_visit` | `url` | `picker` | `event` | `replay`
- `duration_ms`: milliseconds from animation start to completion

Use this with `intro_start` to compare completion time across the three variants
without treating the intro as a mandatory CTA gate.

### `intro_skip`

User skips the entrance animation before entering the home page.

Required properties:

- `locale`: `zh` | `en`
- `page`: `/` | `/en`
- `surface`: `intro_overlay`
- `target`: `skip`
- `source`: `first_visit` | `replay`
- `variant`: `focus` | `line` | `jojo`
- `trigger`: `first_visit` | `url` | `picker` | `event` | `replay`
- `duration_ms`: milliseconds from animation start to skip click

Use this to tell whether the intro animation is getting dismissed before the
real page is revealed.

### `intro_replay`

User replays the entrance animation from the persistent home page control.

Required properties:

- `locale`: `zh` | `en`
- `page`: `/` | `/en`
- `surface`: `intro_overlay`
- `target`: `focus` | `line` | `jojo`
- `source`: `replay`
- `variant`: `focus` | `line` | `jojo`
- `trigger`: `picker` | `event` | `replay`

Use this to measure voluntary replay interest separately from first-visit
exposure.

### `intro_abandon`

User leaves the page while the entrance animation is still active.

Required properties:

- `locale`: `zh` | `en`
- `page`: `/` | `/en`
- `surface`: `intro_overlay`
- `target`: `pagehide`
- `source`: `first_visit` | `replay`
- `variant`: `focus` | `line` | `jojo`
- `trigger`: `first_visit` | `url` | `picker` | `event` | `replay`
- `duration_ms`: milliseconds from animation start to page hide

Use this to estimate watch time for visitors who do not click enter or skip.

### `contact_method_reveal`

User reveals contact information on the Contact page.

Required properties:

- `locale`: `zh` | `en`
- `page`: `/contact` | `/en/contact`
- `surface`: `contact_page`
- `method_name`: `wechat` | `qq_group`
- `action`: `reveal`
- `method`: `hover` | `focus`

Fire once per method per pageview. Do not fire repeatedly on every mouse move.

### `article_contact_reveal`

User reveals inline WeChat contact information inside an article.

Required properties:

- `locale`: `zh` | `en`
- `page`: current article pathname
- `surface`: `article_inline`
- `article_slug`: article identifier
- `method_name`: `wechat`
- `action`: `reveal`
- `method`: `hover` | `focus`

This is a stronger consulting/contact intent signal than a generic Contact page
view because it happens inside article context.

### `sponsorship_method_reveal`

User reveals a sponsorship QR code on the Projects page.

Required properties:

- `locale`: `zh` | `en`
- `page`: `/projects` | `/en/projects`
- `surface`: `sponsorship`
- `method_name`: `wechat_pay` | `alipay`
- `action`: `reveal`
- `method`: `hover` | `focus`

Fire once per method per pageview.

### `project_link_click`

User clicks a project destination from the Projects page or homepage experience
section.

Required properties:

- `locale`: `zh` | `en`
- `page`: current pathname
- `surface`: `home_experience` | `projects`
- `section`: `experience` | `open_source` | `programs` | `learnings` | `theme`
- `project`: stable project identifier
- `link_type`: `site` | `github` | `doc` | `release`
- `href`: destination URL

Do not also fire `github_link_click` for the same click unless there is an
explicit need to duplicate the signal. Prefer one event per user action.

### `talk_resource_click`

User clicks a resource attached to a Talk.

Required properties:

- `locale`: `zh` | `en`
- `page`: current pathname
- `surface`: `talks_feed` | `article_callout` | `article_slide`
- `episode`: talk episode number when available
- `resource`: `deck` | `video` | `record` | `slide`
- `href`: destination URL

Use this because Pages can show `/talks` traffic, but cannot show whether people
opened the deck or watched the recording.

### `talk_join_intent`

User clicks a Talk-specific "join" or "participate" entry point.

Required properties:

- `locale`: `zh` | `en`
- `page`: current pathname
- `surface`: `talks_hero` | `talks_preview` | `talks_upcoming`
- `target`: `contact`
- `href`: contact URL

This is allowed even though it routes to Contact because the source intent
("join the talks") is lost in a plain Contact pageview.

### `language_switch_click`

User switches site language.

Required properties:

- `page`: current pathname before navigation
- `from_locale`: `zh` | `en`
- `to_locale`: `zh` | `en`
- `target_path`: destination pathname

Use this alongside Pages to understand whether English traffic is natural or
driven by users switching from Chinese pages.

## Legacy Events

These events exist in older analytics data and may appear in historical Vercel
dashboards. Do not add new instrumentation with these names unless maintaining
backward compatibility during a migration.

### `home_terminal_open`

Legacy name for `terminal_open`.

Current properties:

- `section`: `terminal`
- `target`: `terminal_shell`
- `method`: `shell_click` | `keyboard_backtick` | `keyboard_activate` | `window_control`

### `home_terminal_command`

Legacy name for `terminal_command`.

Current properties:

- `section`: `terminal`
- `target`: `terminal_shell`
- `command`: command name only

### `home_github_click`

Legacy name for `github_link_click` when the click starts from the homepage.

Current properties:

- `section`: `profile_header` | `open_source`
- `target`: `profile` or repository name
- `href`: GitHub URL

### `home_agent_activity_click`

Legacy name for `agent_competition_click` on the homepage popout.

Current properties:

- `section`: `agent_popout`
- `target`: `feishu_link` | `pill_open` | `minimize` | `close`
- `href`: Feishu link when clicking the activity link

### `home_cta_click`

Deprecated.

This event mixed ordinary internal navigation with real intent signals. Do not
extend it. Pages already answer most of what it tried to measure.

### `home_external_click`

Legacy name for homepage project/work outbound clicks.

Prefer `project_link_click` with `surface: home_experience`.

## Implementation Status

Implemented in current code:

- `terminal_open`
- `terminal_command`
- `github_link_click`
- `agent_competition_click`
- `agent_team_signup`
- `intro_start`
- `intro_complete`
- `intro_skip`
- `intro_replay`
- `intro_abandon`
- `contact_method_reveal`
- `article_contact_reveal`
- `sponsorship_method_reveal`
- `project_link_click`
- `talk_resource_click`
- `talk_join_intent`
- `language_switch_click`

Legacy events retained only for historical data interpretation:

- `home_terminal_open`
- `home_terminal_command`
- `home_github_click`
- `home_agent_activity_click`
- `home_cta_click`
- `home_external_click`
- `intro_cta_view`
- `intro_play`
- `intro_cta_click`

## Adding Or Changing Events

1. Start from the tracking boundary above. If Pages answer the question, do not
   add an event.
2. Add or update the event in this file before changing code.
3. Reuse existing properties before inventing new ones.
4. Keep event names stable after deploy. If the meaning changes, create a new
   event and mark the old one as legacy.
5. Avoid high-cardinality or personal fields. Do not send raw user input.
6. Verify in production with DevTools Network by checking for
   `/_vercel/insights/event`.
