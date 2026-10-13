export function GET() {
  return new Response(
    "google-site-verification: google433e9ff05c90ac77.html\n",
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
