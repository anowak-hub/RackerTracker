export default function Dashboard() {
  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>RackerTracker</h1>
      <p>
        Module overview will render here — the isometric module grid that
        transitions into a flat rack view on selection. Wire this up to{" "}
        <code>GET /api/modules</code> once auth is in place.
      </p>
    </div>
  );
}
