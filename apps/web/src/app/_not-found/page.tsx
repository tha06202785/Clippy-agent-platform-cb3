export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 700, margin: 0 }}>404</h1>
        <p style={{ color: "#666", marginTop: "0.5rem" }}>Page not found</p>
        <a href="/" style={{
          display: "inline-block",
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          background: "#10b981",
          color: "white",
          borderRadius: "0.5rem",
          textDecoration: "none",
        }}>Go home</a>
      </div>
    </div>
  );
}
