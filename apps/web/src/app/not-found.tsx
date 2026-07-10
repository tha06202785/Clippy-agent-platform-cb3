import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground">404</h1>
        <p className="text-muted-foreground mt-2">Page not found</p>
        <Link href="/" className="mt-4 inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg">
          Go home
        </Link>
      </div>
    </div>
  );
}
