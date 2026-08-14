const headers = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

Deno.serve(() =>
  new Response(
    JSON.stringify({
      error: "Legacy outbound delivery is disabled",
      replacement: "Use the authenticated human-approval delivery route",
    }),
    { status: 410, headers },
  ),
);
