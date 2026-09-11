# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Compliance officers and members of a verification committee reviewing hostile outside-party documents.
They choose a supplied document, inspect the extracted evidence and findings, and decide whether to act on the review.

## Product Purpose

Faraday performs a contained local first-pass review of hostile documents against a trusted corpus.
Success means a reviewer can inspect the evidence, outcome and containment boundary without trusting a model's prose.

## Positioning

The Reader can read untrusted text but has no capabilities, while the Planner has capabilities but never reads untrusted document text.

## Operating Context

The Spanish-language one-page interface demonstrates resident-agent onboarding and public procurement with four supplied PDFs.
Reviewers may also add PDFs to their browser session and explicitly assign each document type.
A judge evaluates the containment proof, document extraction, review record and trace in a short recorded demonstration.

## Capabilities and Constraints

All inference is local through QVAC.
The four supplied documents are immutable.
A reviewer may upload PDFs up to 10 MB for the current browser session, choose their document type, and delete only those uploads.
The Reader emits typed claims with anchors, and the Validator issues findings and verification statuses.
The Planner receives typed records and IDs only.

## Evidence on Hand

The supplied sample PDFs, extracted text and HTML templates are under `documents/`.
The trusted policy corpus is under `corpus/`.
The review entry point and scripted model adapter provide recorded review data for the interface.

## Product Principles

- Show the architecture through inspectable evidence, not assurances.
- Make the document, the machine-readable extraction and evidence pointers easy to compare.
- Keep operational states and consequences explicit.
- Never represent injection detection as Faraday's protection mechanism.

## Accessibility & Inclusion

The interface must be keyboard-operable, use semantic controls and preserve readable contrast for document evidence and verification statuses.
