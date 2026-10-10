"use client";

// Last-resort boundary: replaces the root layout, so it can't rely on app styles.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F7F6F0", color: "#14241C" }}>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "96px 24px" }}>
          <p style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "#5E645E" }}>MAKERSIGNAL</p>
          <h1 style={{ fontSize: 30, margin: "12px 0" }}>Something went wrong.</h1>
          <p style={{ color: "#5E645E" }}>Please try again. If it keeps happening, contact support{error.digest ? ` with reference ${error.digest}` : ""}.</p>
          <button
            onClick={reset}
            style={{ marginTop: 24, background: "#14241C", color: "#F7F6F0", border: 0, borderRadius: 999, padding: "10px 18px", fontSize: 14, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
