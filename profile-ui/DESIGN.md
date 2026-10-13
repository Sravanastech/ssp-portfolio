---
name: Sravana S Parimi — Architect Studio
description: Engineering work made legible through three selectable studio compositions.
colors:
  primary: "#244ce4"
  ink: "#17243c"
  lime: "#dce99b"
  paper: "#f3f5fa"
  surface: "#ffffff"
  text-secondary: "#52617c"
  border: "#ccd3e1"
  border-light: "#e3e7f0"
  success: "#147348"
  warning: "#8a5700"
  error: "#b52d3a"
typography:
  display:
    fontFamily: '"Space Grotesk", sans-serif'
    fontSize: "clamp(48px, 5.65vw, 82px)"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  headline:
    fontFamily: '"Space Grotesk", sans-serif'
    fontSize: "clamp(32px, 3.5vw, 48px)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  body:
    fontFamily: '"Space Grotesk", sans-serif'
    fontSize: "16px"
    lineHeight: 1.6
  lede:
    fontFamily: '"Space Grotesk", sans-serif'
    fontSize: "clamp(18px, 1.5vw, 21px)"
    lineHeight: 1.7
rounded:
  button: "6px"
  artwork: "10px"
  panel: "12px"
  chip: "24px"
  selector: "28px"
spacing:
  gap: "24px"
  grid: "32px"
  wide: "48px"
  section: "clamp(64px, 7vw, 112px)"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.button}"
    padding: "13px 24px"
  button-light:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "13px 24px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "13px 24px"
---

# Design System: Architect Studio

## Overview

**Creative North Star: "Architect Studio"**

Engineering work is presented through spacious typography, cool paper surfaces, cobalt stages, and open geometric constructions. The user approved all three compositions: Bold (A), Bright (B), and Spatial (C). They share content and a visual language while changing its arrangement.

This document records the implemented studio system in `src/index.css`, `src/theme/themeConfig.ts`, and the studio components. The default Sunrise theme now uses the studio palette. Woodland and Ocean remain selectable alternatives; fixed studio artwork colors retain their own palette.

**Key Characteristics:**

- Large, balanced headings with short supporting copy.
- Flat surfaces, fine dividers, and restrained rounded corners.
- Illustrative project artwork with explicit provenance.
- User-controlled composition and engineering-layer exploration.

## Colors

### Primary

Cobalt directs attention to actions, headings, and the large studio stages. Semantic theme variables drive most text and surfaces; fixed studio variables keep the illustrations and blue hero consistent.

### Secondary

Pale lime highlights the hero action and selected system node or plane. It also supplies focus contrast on cobalt stages.

### Neutral

Cool paper forms the page background; white separates panels. Ink carries primary text, slate carries supporting text, and the two border tones divide content. Success, warning, and error colors serve status messages.

**The Semantic Surface Rule.** Use theme variables for interface text, fields, borders, and surfaces; preserve fixed artwork colors within the studio illustrations.

## Typography

Space Grotesk is used for headings and body copy, with a sans-serif fallback. The stylesheet loads weights 400, 500, and 700. The hero uses the display role; section titles use the headline role. Interior page titles use `clamp(42px, 5.5vw, 76px)` at weight 500. Spatial uses a smaller desktop hero title to fit its introductory rail.

Supporting copy uses line heights between 1.6 and 1.8. Hero descriptions stay within 52 characters per line, lead copy within 62, and prose within 68. Compact metadata is subordinate to readable project titles and summaries.

## Layout

The main container caps at 1280px with 48px desktop gutters. Gutters reduce to 32px below 1100px and 20px below 700px. The sticky header is 88px tall on desktop and 76px on mobile. Navigation switches to a mobile sheet below 950px.

Bold pairs a diagonal cobalt-and-paper opening and open node geometry with a project index. Bright uses a paper opening, open node geometry, and staggered white project panels. Spatial puts an introduction and navigation rail beside a large cobalt stage with intersecting planes, then uses a two-column project arrangement. Below 700px, major grids stack; Bold keeps compact image-and-text project rows. Interior pages inherit Bright's centered introductions or Spatial's cobalt introduction panels.

**The Shared Content Rule.** Composition changes rearrange the same information and destinations. Keep the reading order coherent at every breakpoint.

## Elevation & Depth

Studio sections are predominantly flat: color blocks, borders, overlapping geometry, and scale provide depth. The hero construction sits openly on its composition background; selected nodes grow slightly, while Spatial highlights the selected plane. Project artwork grows gently on hover. Buttons move upward by 3px on hover. The studio system does not introduce a broad shadow vocabulary; legacy form primitives retain their existing subtle shadow treatment.

## Shapes

Buttons use small rounded corners; project art and panels use larger corners. The selector and case-study links are pill-shaped. Open system nodes combine a circle and squares joined by fine paths. Spatial uses intersecting polygon planes. Project covers depict inspection records, workforce calendar entries, and commerce discovery connected through interfaces to their next workflow step. They are explicitly conceptual. Hover or keyboard focus traces the connector once in 650ms; reduced motion disables the trace. The Spatial stage has square corners; the mobile Bold sketch receives a small rounded paper surface.

## Components

### Buttons

Primary buttons use theme primary and accent colors, with a minimum height of 50px. The hero action uses lime and ink. Secondary buttons use transparent backgrounds and a fine border. Focus uses a visible outline; disabled submission controls reduce opacity.

### Navigation

Desktop links have a 44px minimum height and an animated underline for hover and active states. Mobile navigation uses a sheet with larger text and divided rows. A skip link reveals itself on keyboard focus and targets the main content.

### Composition selector

A native radio group exposes A · Bold, B · Bright, and C · Spatial with visible names. The selected option has a pale lime background, ink text, and a checkmark on the fixed ink footer. Selection updates immediately and persists under `portfolio-composition`; blocked storage leaves the in-memory selection usable. Palette buttons show names, three color swatches, and a selected checkmark in a compact wrapping group. Controls have at least 44px targets and visible focus.

### Cards / Containers

Project previews share conceptual workflow diagrams, organization, title, summary, contribution, technologies, and a case-study link across all three arrangements. Bold groups all project text in a readable column beside the diagram. Case studies use problem, contribution, and outcome sections, followed by a conceptual workflow. Contact uses a bordered surface panel with responsive internal padding.

### Inputs / Fields

Contact inputs use theme text, background, and border colors, rounded corners, and at least 48px height. The message field is at least 160px tall and vertically resizable. Labels remain visible; errors are attached to fields, and the form exposes busy state. Preserve these behaviors when restyling fields.

### Case-study links

Pill-shaped anchor links have a minimum 44px height and a surface fill on hover. They jump to the corresponding study with room below the sticky header.

### Interactive systems sketch

Architect, Design, Plan, Develop, and Deliver form a connected, numbered workflow. Each stage is a native button with a matching icon (blocks, pen, checklist, code, rocket), a short output label, and a pressed state. Selection updates one stable, live-announced explanation below the diagram. Desktop presents a horizontal sequence; mobile uses a vertical sequence. Bold uses cool paper, Bright uses semantic theme surfaces, and Spatial retains its cobalt stage. Pale lime highlights the selected icon. Decorative connectors are hidden from assistive technology; the ordered list and labeled controls carry the sequence. Connectors draw once in 700ms. On stage selection, a signal travels toward the selected stage on both desktop and mobile. Each stage includes a compact conceptual diagram: Structure → Services → Data; People → UI → Workflow; Priorities → Tasks → Team; UI ↔ API ↔ Database; and UI → API → Database → Production. The final diagram illustrates delivery, not deployment order or a literal runtime topology. Signals run once in 850ms, with the Develop response signal delayed by 100ms. Reselecting a stage replays the signal. Reduced motion hides signals and keeps static connectors and labels visible. This conceptual workflow replaces the original UI/API/Ship geometry across all compositions.

## Do's and Don'ts

### Do:

- **Do** keep the three approved compositions available through the shared selector.
- **Do** use semantic colors for new interface surfaces.
- **Do** preserve keyboard focus, native controls, reduced-motion behavior, and visible form labels.
- **Do** identify conceptual project visuals as illustrations.

### Don't:

- **Don't** replace verified project contributions with unsupported performance or business metrics.
- **Don't** expose private resume content through public visual assets or pages.
- **Don't** assume a composition is a separate content version.

Not canonized: some inherited components request font weights that are not loaded, and small illustration captions are decorative rather than a model for readable body copy. These are implementation review concerns, not rules for future surfaces.

## Final refinement — September 2026

The header exposes only a light/dark appearance button. The footer's native Appearance settings disclosure contains the three composition choices and existing palettes. Native disclosure preserves keyboard behavior without a modal. Ocean is dark; Sunrise is the default light palette. The diagram redraws its connectors or reveals its planes on layer selection; sequences finish within 700ms and are suppressed for reduced motion. This finite sequence is the focal animation; reading sections remain stable.

## Positioning refinement

Full stack engineering leads the headline; technical leadership and project/portfolio planning support it. Planning, prioritization, task assignment, reviews, and mentorship are owner-confirmed responsibilities. Official employment titles remain intact; no numerical achievements or employer-specific planning claims are inferred.
