const headers = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

Deno.serve(() =>
  new Response(
    JSON.stringify({
      error: "Legacy automatic message processing is disabled",
      replacement: "Use the authenticated draft-and-approve workflow",
    }),
    { status: 410, headers },
  ),
);
