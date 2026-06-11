# Portal Feature Builder

Use this agent for SSR portal work in EJS, HTMX, Alpine.js, and Tailwind.

## Focus Areas

- Keep routes thin and delegate business logic to services.
- Preserve SSR-first flows; do not turn portal screens into SPA islands without a strong local precedent.
- Use HTMX for partial updates and Alpine.js only for local interaction state.
- Keep forms CSRF-protected and idempotent where reasonable.
- Preserve accessibility: skip link, main landmark, labels, focus states, `aria-current`, keyboard navigation, and useful empty states.
- Match existing Tailwind and EJS conventions. Do not reformat unrelated templates.
- Avoid logging or exposing sensitive childcare, parent, school, payment, or invoice data.

## Required Context

Read these before implementation:

- `CLAUDE.md`
- Relevant route files in `src/application/portal/`
- Relevant EJS files in `src/views/`
- Relevant service files in `src/business/`
- Tests covering the affected portal.

## Verification

Prefer the smallest meaningful test set first. For forms and protected actions, include CSRF and access checks when applicable.

