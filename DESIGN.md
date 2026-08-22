# LeadIntel — Style Reference
> Mission control in a darkroom. Adapted from the REKKI design system.
> Source: https://styles.refero.design/style/65b8df27-36a3-47a6-be53-735d1f6a485d

**Theme:** dark (dark only — there is no light mode in this system)

A pitch-black canvas hosting dense product interfaces that glow from within. Nearly
monochromatic — no semantic color clutter, no decorative gradients — letting one
electric blue do all the emotional heavy lifting on CTAs, active states, and brand
punctuation. Components sit on the canvas like instrument panels: dark, lightly
elevated by near-invisible inset white borders rather than drop shadows, with
pill-shaped interactive elements that feel like physical switches.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Signal Blue | `#0063e1` | `--color-signal-blue` | Primary CTA fill, active nav indicator, brand accent dots, link highlights — the single chromatic voice |
| Obsidian | `#040910` | `--color-obsidian` | Page canvas, dominant background, hairline dividers, icon fill — the floor of the system |
| Carbon | `#0d0d0d` | `--color-carbon` | Alias of Graphite — every box surface is one flat grey |
| Graphite | `#0d0d0d` | `--color-graphite` | Elevated card surfaces, section backgrounds, border fills — mid-surface layer |
| Iron | `#1f1f1f` | `--color-iron` | Input field backgrounds, form controls, tertiary surfaces |
| Steel | `#2b2c2e` | `--color-steel` | Highest card elevation, modal surfaces, hover states — ceiling of the surface stack |
| Ash | `#858585` | `--color-ash` | Body text, muted labels, secondary borders — workhorse neutral for non-heading text |
| Fog | `#8c8c8c` | `--color-fog` | Link text, subdued navigation labels |
| Smoke | `#979797` | `--color-smoke` | Icon strokes, tertiary button borders, low-priority text |
| Paper | `#ffffff` | `--color-paper` | Headings, at-a-glance text, light neutral action fill on dark surfaces |

Surface stack, in order: Obsidian -> Carbon -> Graphite -> Iron -> Steel.
Maintain clear luminance steps between levels.

The canvas is `#040910`, a near-black with a faint blue cast. Every box surface —
cards, panels, the closer, the queue — is one flat `#0d0d0d`. Carbon and Graphite
now hold the same value on purpose: there is no second box tone.

Boxes are lighter than the canvas, so elevation reads the right way round again,
but the step is only 1.027:1. That is far below the ~1.10:1 an eye needs to catch
an edge unaided, so the 12% inset border is doing essentially all the work of
separating a box from the page. Iron and Steel stay distinct because form inputs
and hover states would otherwise vanish into the cards they sit in.

## Tokens — Typography

Substitutes for REKKI's licensed faces:

| Original | Substitute | Use |
|----------|-----------|-----|
| Diatype REKKI | Inter (variable) | Display, headings, body, nav, buttons — everything |
| Diatype REKKI Bolder Rounded | Inter 700 | Sparingly: 72px hero declarations, 12-20px emphasis labels |
| OCD-GARRI | JetBrains Mono | Product UI labels, status indicators, tabular data, eyebrows |

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|------|------|-------------|----------------|-------|
| caption | 12px | 1.2 | -0.005em | `--text-caption` |
| body | 16px | 1.5 | -0.007em | `--text-body` |
| subheading | 18px | 1.4 | -0.015em | `--text-subheading` |
| heading-sm | 20px | 1.33 | -0.027em | `--text-heading-sm` |
| heading | 24px | 1.33 | -0.027em | `--text-heading` |
| heading-lg | 56px | 1.25 | -0.040em | `--text-heading-lg` |
| display | 86px | 1.0 | -0.064em | `--text-display` |

Headlines are weight 400. Authority comes from size and negative tracking, never weight.

## Tokens — Spacing & Shape

**Base unit:** 4px · **Density:** comfortable

Scale: 4, 8, 12, 16, 20, 24, 32, 40, 44, 48, 56, 60, 72, 80, 120

### Border Radius

| Element | Value |
|---------|-------|
| nav | 2px |
| inputs | 8px |
| cards | 16px |
| images | 24px |
| largeCards | 30px |
| buttons | 59px (pill) |

### Shadows

| Name | Value | Token |
|------|-------|-------|
| subtle | `rgba(255,255,255,0.12) 0 0 0 1px inset` | `--shadow-subtle` |
| subtle-2 | `rgba(255,255,255,0.2) 0 0 1px 0` | `--shadow-subtle-2` |

There are no drop shadows in this system. The inset white border IS the elevation.

### Layout

- Page max-width: 1200px
- Section gap: 80px
- Card padding: 24px
- Element gap: 20px

## Components

**Primary CTA** — pill (59px radius), Signal Blue fill, white 16px/400 at -0.007em,
padding 20px/32px. No shadow. One per viewport.

**Nav header button** — smaller pill, Signal Blue fill, white 12-14px, padding 14-20px, top-right.

**Nav link** — plain text, no underline. Inactive Ash `#858585`, active Paper `#ffffff`.
16px/400 at -0.007em. No background, no border.

**Hero display heading** — 86px/400, Paper, -0.064em, line-height 1.0.

**Section heading** — 56px/400, Paper, -0.040em, line-height 1.25.

**Product UI panel card** — Carbon or Graphite background, 16px radius, 1px inset
white border at 12% opacity, 24px padding. Holds dense tabular data with mono labels.

**Standard card** — Graphite or Steel background, 8-16px radius, inset border, 16-24px padding.

**Feature card with image** — 24-30px radius, dark background, image area 24px radius, overflow hidden.
Title 20-24px, body 16px Ash.

**Text input** — Iron `#1f1f1f` background, 8px radius, outer glow `rgba(255,255,255,0.2) 0 0 1px 0`.
White text, Ash placeholder.

**Status pill / tag** — small pill, dark background, white or muted text, mono 12-13px.

## LeadIntel adaptation — lead priority states

REKKI's rule is one chromatic accent, full stop. LeadIntel needs HOT / WARM / COLD
to be readable at a glance. Resolve this WITHOUT introducing red and green:

- HOT — Signal Blue `#0063e1` pill, white text. Blue is scarce, so it reads as urgent.
- WARM — Steel `#2b2c2e` pill, Paper `#ffffff` text.
- COLD — Graphite `#0d0d0d` pill, Ash `#858585` text.
- Below minimum / out of area — same COLD pill plus a mono caption in Ash.

Priority is encoded as luminance and blue-scarcity, not hue. This keeps the system
monochromatic and stays legible for colorblind users.

## Do

- Use `#0063e1` exclusively for the single primary CTA per viewport — never decorative
- Scale tracking with size: -0.064em at 86px down to -0.005em at 12px
- Weight 400 for all headlines, no exceptions
- Communicate elevation through the 12% inset white border, never drop shadows
- Keep the 5-level surface stack with clear luminance steps
- 59px radius for pills, 16px for cards — never mix on the same element type
- Let product UI screenshots be the focal point of marketing sections, not stock photography

## Don't

- Never introduce a second chromatic accent — no green, no red, no purple
- Never apply drop shadows to cards or panels
- Never set body text dimmer than `#858585` against the black canvas
- Never use bold (700) for headlines — it destroys the signature
- Never use positive letter-spacing on display type
- Never place white or light-colored cards on the dark canvas
- Never raise surface saturation or lightness to where a card competes with the CTA

## Logo

The mark is the LeadIntel eclipse: a dark sphere with a blue rim-light and bevelled
`LI`. Shipped as `assets/logo-mark-128.png` and rendered at **34px**.

34px is a floor, not a preference. The mark carries a rim highlight, a bevel and a
glow, and below roughly 34px those details collapse and the `LI` stops being legible.
Do not shrink it to match a tighter header; raise the header instead. The bundled
transparent PNG already contains its own glow falloff, so it needs no extra padding —
the logo gutter is 10px rather than the 11px used elsewhere.

Because the mark is itself blue, it counts against the one-accent budget on any screen
where it appears. It sits in the header and footer only; do not repeat it inside page
content alongside a primary CTA.

## Favicon

Generated from the same eclipse artwork:

- `favicon.ico` — 16/32/48px PNGs in one container
- `assets/favicon-16.png`, `assets/favicon-32.png` — transparent, for browser tabs
- `assets/apple-touch-icon.png` — 180px, cut from the version already composited
  on `#0A0A0A`. iOS does not honour transparency on home-screen icons, so this one
  must stay opaque.

At 16px the `LI` is not legible and is not meant to be — the mark reads as a blue
orb, which is enough to find in a row of tabs.

