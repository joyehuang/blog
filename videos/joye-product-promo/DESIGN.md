# Design System

## Overview

Joye Personal Blog is a dark-mode portfolio and writing site with a compact, system-like layout. The page centers a narrow content column on a near-black canvas, using thin borders, low-contrast cards, terminal UI, and small interaction cues instead of large marketing imagery. The visual identity is technical but personal: avatar portrait, location/GitHub labels, a command-line entry point, research lists, experience cards, skill chips, and a small blue line mascot. The tone is calm, precise, and product-minded.

## Colors

- **Primary Surface**: `#0B0B10` - page canvas and deep background.
- **Raised Surface**: `#1D1D20` - cards, terminal shells, stat tiles, and section modules.
- **Border Quiet**: `#313135` - thin dividers and rounded card outlines.
- **Primary Text**: `#FAFAFA` - headings, brand name, and active labels.
- **Secondary Text**: `#BCBCC2` - body copy, descriptions, dates, and muted metadata.
- **White Utility**: `#FFFFFF` - high-contrast icon strokes and occasional text.
- **Live Green**: `#4ADE80` - status dot, online cue, and action signal.
- **Mascot Blue**: `#B4EBFD` - small mascot glow, avatar atmosphere, and friendly accent.
- **Ink Black**: `#09090B` - terminal interiors and deeper card wells.

## Typography

- **Primary Sans**: Satoshi `400/500/600/700`. Used for all navigation, headings, cards, body copy, and labels. It should feel clean and modern, not oversized.
- **Monospace**: JetBrains Mono `400/500/600`. Used for terminal commands, command prompts, code pills, status readouts, and technical labels.
- **Observed Scale**: homepage name around `30px`/`700`, section headings around `20px`/`600`, card titles around `18px`/`500`, body and metadata around `14-16px`.
- **Video Adaptation**: scale type up for 1920x1080 while keeping the hierarchy restrained: large title `76-108px`, scene headings `44-64px`, body `28-34px`, terminal text `24-30px`.

## Elevation

Depth comes from flat layers, not heavy shadow. Cards use rounded corners, dark fill, subtle borders, and controlled contrast shifts. The terminal shell and content lists sit slightly above the canvas through `#1D1D20` or `#09090B` surfaces with `#313135` outlines. Glow should be localized and faint, mainly around green status points or blue mascot/avatar accents.

## Components

- **Centered Identity Header**: avatar, name, location, GitHub label, and live connect pill arranged vertically with generous breathing room.
- **Interactive CLI Strip**: a thin terminal prompt that invites `help`, `chat`, or `ls /blog`; uses JetBrains Mono, code pills, and a black rounded shell.
- **Content List Rows**: blog and notes entries as compact rounded rows with date/type metadata, title, right arrow, border, and hover-like brightness.
- **Experience Stack**: dark rounded cards with role title, subtitle, and one-line product outcome.
- **Research/Open-Source Cards**: wider dark cards that combine project title, concise description, and star count.
- **Skill Chips**: small pill-shaped tags grouped by category, using muted borders and neutral fills.
- **Stat Tiles**: square-ish compact counters with large numeric values and small labels.
- **Mascot Readout**: small blue line character with a terminal bubble; playful but peripheral.

## Do's and Don'ts

### Do's

- Use the captured near-black canvas and thin borders as the main structure.
- Keep layouts dense, centered, and modular rather than spacious hero-marketing style.
- Use JetBrains Mono for command, route, and status moments.
- Use `#4ADE80` sparingly as a live/action signal.
- Let the avatar, terminal strip, cards, and skill chips become the promo's recognizable visual motifs.

### Don'ts

- Do not introduce bright full-screen gradients or saturated neon backgrounds.
- Do not make the page feel like a generic SaaS landing page.
- Do not use large rounded glass cards or heavy shadows.
- Do not overuse accent colors; most of the frame should remain `#0B0B10`, `#1D1D20`, `#FAFAFA`, and `#BCBCC2`.
- Do not replace the personal builder identity with abstract stock product imagery.
