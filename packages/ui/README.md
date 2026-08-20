# `@clippy/ui`

Shared, theme-aware UI primitives for Clippy web surfaces. These components own
the accessibility and interaction defaults that should not be reimplemented in
feature pages.

## Public API

- `Button`, `IconButton`, `buttonVariants`
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `Input`, `Select`, `Textarea`
- `Badge`, `Skeleton`
- `LoadingState`, `EmptyState`, `ErrorState`, `PageSkeleton`
- `cn`

`Button` defaults to `type="button"`; form submission must be explicit with
`type="submit"`. Use `isLoading` and `loadingText` for mutations so repeated
activation is blocked and announced.

```tsx
import { Button, Input } from "@clippy/ui";

<form onSubmit={save}>
  <label htmlFor="agency-name">Agency name</label>
  <Input id="agency-name" name="agencyName" required />
  <Button type="submit" isLoading={saving} loadingText="Saving…">
    Save agency
  </Button>
</form>;
```

Icon-only actions use `IconButton`, which requires an accessible name at the
type level.

```tsx
<IconButton aria-label="Close panel" variant="ghost" onClick={onClose}>
  <X aria-hidden="true" />
</IconButton>
```

Every data surface must distinguish loading, empty, and failed states.

```tsx
if (loading) return <LoadingState label="Loading clients" />;
if (error) {
  return (
    <ErrorState
      title="Clients could not be loaded"
      description={error.message}
      action={<Button onClick={retry}>Try again</Button>}
    />
  );
}
if (!clients.length) {
  return <EmptyState title="No clients yet" description="Import or add one." />;
}
```

The web app scans this package in `tailwind.config.ts`; keep styling in semantic
tokens such as `bg-card`, `text-foreground`, `text-muted-foreground`,
`border-border`, and `ring-ring`. Do not add fixed white/neutral surfaces to new
shared components.

Dialogs use the Radix-backed wrapper in
`apps/web/src/components/ui/dialog.tsx`, which supplies the portal, backdrop,
focus trap, Escape dismissal, accessible title/description, and responsive
bottom-sheet layout.
