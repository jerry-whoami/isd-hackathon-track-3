---
name: Faraday
description: Instrumental evidence review for contained hostile-document analysis.
colors:
  cobalt: "#174fa6"
  cobalt-deep: "#10366f"
  cobalt-pale: "#dbe5f4"
  instrument-ink: "#101719"
  instrument-rail: "#172226"
  rail-raised: "#223136"
  mineral-paper: "#f4f2e9"
  bright-paper: "#fffef8"
  work-canvas: "#dcded8"
  danger-orange: "#b9431d"
  danger-deep: "#7c2a10"
  danger-pale: "#f0d8ca"
  evidence-yellow: "#f0c84a"
  verified-green: "#1b6048"
  rule: "#9ca5a2"
  rule-soft: "#c6cbc6"
  muted-ink: "#4e5a5c"
  rail-muted: "#b8c3c2"
typography:
  display:
    fontFamily: "Faraday Sans, Arial Narrow, sans-serif"
    fontSize: "clamp(2.25rem, 4.2vw, 4.6rem)"
    fontWeight: 800
    lineHeight: 0.94
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Faraday Sans, Arial Narrow, sans-serif"
    fontSize: "1.45rem"
    fontWeight: 800
    lineHeight: 1.08
  body:
    fontFamily: "Faraday Sans, Arial Narrow, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.42
  label:
    fontFamily: "Faraday Sans, Arial Narrow, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0.035em"
rounded:
  square: "0"
spacing:
  tight: "8px"
  field: "16px"
  section: "22px"
  frame: "62px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.bright-paper}"
    rounded: "{rounded.square}"
    padding: "10px 17px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.cobalt-deep}"
    textColor: "{colors.bright-paper}"
    rounded: "{rounded.square}"
  field:
    backgroundColor: "{colors.bright-paper}"
    textColor: "{colors.instrument-ink}"
    rounded: "{rounded.square}"
    padding: "13px"
  status-verified:
    backgroundColor: "{colors.verified-green}"
    textColor: "{colors.bright-paper}"
    rounded: "{rounded.square}"
    padding: "2px 7px"
---

# Design System: Faraday

## Overview

**Creative North Star: "Observatorio de evidencia"**

Faraday looks like calibrated review equipment rather than a generic compliance dashboard.
Mineral-white reading surfaces sit inside dark instrument rails, while ruled fields preserve the visible boundary between hostile evidence, trusted policy, and consequential action.
The system is dense but never cryptic: every active state, source, and status must remain legible during a short operational review.

**Key Characteristics:**
- Square, ruled surfaces with no decorative rounding.
- Cobalt for location, navigation, and selected evidence.
- Danger orange only for hostile content, consequential risk, and errors.
- Condensed operational typography paired with monospace evidence records.
- Persistent provenance and explicit boundaries between Reader, Planner, and policy corpus.

## Colors

The palette combines cool mineral neutrals with two tightly controlled signals: cobalt for orientation and orange for danger.

### Primary
- **Cobalt:** Locates active navigation, selected records, primary actions, and evidence focus.
- **Deep Cobalt:** Strengthens hover states and links on light fields.
- **Pale Cobalt:** Provides a quiet hover field for selectable evidence.

### Secondary
- **Danger Orange:** Marks hostile material and failed states, never routine decoration.
- **Evidence Yellow:** Carries transient evidence location and keyboard focus.
- **Verified Green:** Marks positive verification and the live containment indicator.

### Neutral
- **Instrument Ink:** Anchors the masthead and primary dark text.
- **Instrument Rail:** Defines persistent specimen and containment regions.
- **Mineral Paper:** Holds documents, controls, and review records.
- **Work Canvas:** Separates the operational field from paper surfaces.
- **Rule and Soft Rule:** Organize dense records with one-pixel boundaries.
- **Muted Ink and Rail Muted:** Carry secondary text on their respective light and dark fields.

**The Signal Separation Rule.** Cobalt means location or selection, orange means danger or failure, and the two never exchange roles.

## Typography

**Display Font:** Faraday Sans, a self-hosted Open Sans Condensed family, with Arial Narrow and sans-serif fallbacks.
**Body Font:** Faraday Sans with the same fallbacks.
**Label/Mono Font:** The platform monospace stack for extracted text, JSON, tool calls, and measurements only.

**Character:** The condensed sans gives dense operational records authority without sacrificing scanning speed.
Monospace appears only where alignment, machine readability, or literal data requires it.

### Hierarchy
- **Display** (800, fluid from 2.25rem to 4.6rem, 0.94): Names the active document or workflow stage.
- **Title** (800, 1.45rem, 1.08): Names rails, policy documents, and primary comparison regions.
- **Body** (400, 1rem, 1.42): Supports operational explanation with a maximum measure of 72 characters.
- **Label** (600 or 800, 0.67rem to 0.8rem): Carries metadata, statuses, specimen numbers, and compact controls.

**The Literal Data Rule.** Reserve monospace for source text, structured output, arguments, and measurements; interface labels remain condensed sans.

## Layout

Desktop uses a 268px specimen rail beside a fluid review field.
The masthead aligns to that same rail width, and the main field uses responsive horizontal padding up to 62px.
Primary comparisons use two equal or near-equal columns joined by a one-pixel rule rather than separated cards.
Sections follow a 22px vertical rhythm, with tighter 8px grouping inside records and 16px field padding.
At 820px the specimen rail becomes a horizontal scrollable tray and comparison panes stack.
At 640px headers and actions stack, policy inbox items scroll horizontally above their preview, and all primary actions span the available width.

**The Joined Surface Rule.** Related records share one ruled container; do not scatter them into floating cards.

## Elevation & Depth

The system is flat by default and relies on tonal layers, dark rails, and one-pixel rules for hierarchy.
A soft ambient shadow appears only under the large document comparison and policy workspace to lift paper from the canvas.
Selected evidence may use a soft downward cobalt shadow to make its exact span flare without imitating physical embossing.

**The Paper First Rule.** Add shadow only when a whole paper workspace must separate from the canvas, never to decorate individual rows.

## Shapes

All product surfaces, fields, tags, controls, and indicators are square.
Borders are one pixel and structural.
Small filled squares act as calibrated location marks, while CSS-drawn chevrons provide consistent navigation and disclosure cues.

## Components

### Buttons
- **Shape:** Square with a minimum height of 44px.
- **Primary:** White text on cobalt with compact 10px by 17px padding and heavy condensed type.
- **Hover / Focus:** Hover deepens to cobalt-deep; keyboard focus uses a three-pixel evidence-yellow outline with offset.
- **Secondary:** Transparent on dark rails with a quiet one-pixel rail border.
- **Disabled:** Uses neutral gray fill and text with a not-allowed cursor.

### Status Tags
- **Style:** Compact uppercase labels with solid fills and no rounded capsule treatment.
- **State:** Green means verified, amber means corrected or unverified, and deep orange means missing.

### Containers
- **Corner Style:** Square.
- **Background:** Mineral paper or bright paper according to reading density.
- **Shadow Strategy:** Flat by default, with ambient lift only for complete workspaces.
- **Border:** One-pixel instrument ink or rule.
- **Internal Padding:** Usually 16px to 22px.

### Inputs / Fields
- **Style:** Bright paper, dark ink, one-pixel neutral stroke, and square corners.
- **Focus:** Global evidence-yellow focus outline.
- **Error / Disabled:** Danger-orange boundary for failure; neutral gray for disabled state.

### Navigation
- Active workflow steps use a cobalt field and a numbered square.
- Previous and next controls stay at the top-right on desktop and remain grouped at the right edge below the step row on mobile.
- The specimen tray uses numbered dark rows with a mineral-paper active state.

### Evidence Locator
- Findings are semantic buttons with pressed state.
- Selecting a finding turns the row cobalt, scrolls its exact source span into view, moves focus to that span, and changes the span from evidence yellow to cobalt.

### Policy Workspace
- Trusted policy documents use a two-column inbox and preview on desktop.
- Mobile keeps the inbox as a horizontal selector directly above the full preview.

## Do's and Don'ts

### Do:
- **Do** preserve visible separation between hostile document text, trusted policy, and Planner-safe records.
- **Do** use joined ruled grids for comparisons and dense evidence.
- **Do** keep every interactive state understandable without relying on color alone.
- **Do** keep top-right workflow navigation and a visible mobile equivalent.
- **Do** honor reduced motion and maintain keyboard focus through dynamic updates.

### Don't:
- **Don't** use rounded dashboard cards, ornamental gradients, glass effects, or decorative icon tiles.
- **Don't** use danger orange for ordinary navigation or selection.
- **Don't** use monospace as a general interface costume.
- **Don't** hide policy provenance, evidence anchors, or the Reader and Planner boundary.
- **Don't** replace semantic controls with glyph-only interactions.
