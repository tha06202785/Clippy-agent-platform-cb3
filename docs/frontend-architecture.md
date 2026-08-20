# Clippy frontend architecture

This is the production contract for new or changed Clippy interfaces.

## Layers

1. `apps/web/src/app/globals.css` and `tailwind.config.ts` define semantic light
   and dark tokens, motion behavior, safe-area support, and global focus.
2. `packages/ui` contains reusable framework-neutral primitives and page states.
3. `apps/web/src/components/ui` contains app-framework patterns such as the
   Radix dialog wrapper.
4. Feature components own domain behavior. Large independent panels belong in a
   feature folder, for example `components/copilot/action-cards.tsx`.
5. App Router pages compose features and provide `loading.tsx`, `error.tsx`,
   `not-found.tsx`, and `global-error.tsx` boundaries.

Pages must not duplicate primitive focus, disabled, loading, or dark-mode
styles. When a pattern appears twice, move it down one layer before a third copy
is added. Keep route components focused on orchestration; extract a panel when
it has its own state/API or makes its parent difficult to review.

## Component API rules

- Prefer native semantics first: `button`, `a`, `form`, `label`, `fieldset`,
  `table`, and headings.
- Every native button has an explicit `type`. `Button` defaults to the safe
  non-submit type.
- Icon-only buttons require `aria-label`; decorative icons use
  `aria-hidden="true"`.
- Controlled mutations expose `isLoading`, disable repeat submission, and keep
  the visible verb in the loading label.
- Inputs have a stable `id` and associated label. Errors use `role="alert"` and
  invalid fields use `aria-invalid`/`aria-describedby` when field-specific.
- Tables have a caption (visible or screen-reader-only) and column headers use
  `scope="col"`.
- Use `next/image` with dimensions or `fill` plus `sizes`.

## State and failure contract

Every remote-data surface defines four states: loading, data, empty, and error.
The error state preserves existing data when safe and offers a retry. Mutations
must check `response.ok`; do not swallow failures. Approval-first actions must
never imply delivery unless the delivery response confirms it.

Route failures are caught by the dashboard error boundary and reported to
Sentry. Root failures use `global-error.tsx`; unknown routes have a recovery
action in `not-found.tsx`.

## Accessibility and responsive contract

- The dashboard exposes one main landmark and a keyboard-visible skip link.
- Dialogs use the shared Radix wrapper. It traps focus, restores focus, responds
  to Escape, and becomes a bottom sheet on small screens.
- The mobile navigation drawer traps focus, closes with Escape, and removes
  off-canvas links from the tab order.
- Layouts start at one column and add columns with `sm`, `md`, or `lg`. Wide
  tables live in an `overflow-x-auto` container and declare a minimum width.
- Touch actions target approximately 44px where practical.
- `prefers-reduced-motion` disables non-essential animation and smooth motion.
- Light and dark themes use semantic tokens. New code must not depend on fixed
  `bg-white`/`text-neutral-900` pairs.

## Verification

Run before review:

```bash
pnpm --filter @clippy/web test
pnpm --filter @clippy/web type-check
pnpm --filter @clippy/web build
pnpm --filter @clippy/web exec playwright test
```

`tests/ui-contract.test.ts` prevents regression to missing button types, raw
image elements, clickable non-interactive containers, unscoped table headers,
unassociated labels, and nested dashboard main landmarks. Playwright runs public
smoke coverage at desktop and mobile sizes. Authenticated flows require the
dedicated `TEST_EMAIL` and `TEST_PASSWORD` secrets; they must not be treated as
executed when those secrets are absent.
