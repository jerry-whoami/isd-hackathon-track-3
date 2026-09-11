---
status: accepted
---

# TypeScript end to end

The original plan put the web tier on FastAPI. QVAC's runtime is Node: its Python package is a
client that still needs Node to host the inference worker, and that path was never tested.
Faraday therefore runs one runtime everywhere — TypeScript executed directly with `tsx`, no build
step — with a small Node web server rendering server-side templates, plus HTMX, Tailwind and
DaisyUI from a CDN.

The deciding reason is that the Reader's output grammar, the Validator's parser and the Planner's
tool definitions become one set of schemas in one codebase, so the shape the model is held to and
the shape the Validator accepts cannot drift apart.

## Considered options

- **Python everywhere through `tetherto-qvac-sdk` (rejected).** Keeps FastAPI but adds an untested
  client–worker bridge inside the one container the security claim rests on.
- **Node for the model containers, Python for the web tier and Validator (rejected).** Two
  toolchains, and every schema duplicated across a language boundary.
