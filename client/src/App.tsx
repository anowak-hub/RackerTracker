import { SignedIn, SignedOut, SignIn, useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard.js";
import { syncAuth } from "./lib/api.js";

export default function App() {
  return (
    <>
      <SignedOut>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "4rem" }}>
          <SignIn />
        </div>
      </SignedOut>
      <SignedIn>
        <AuthenticatedApp />
      </SignedIn>
    </>
  );
}

/**
 * Runs the org/user sync exactly once per session right after Clerk
 * confirms the user is signed in, then renders the real app. Without
 * this, requests to protected API routes would 401 with SYNC_REQUIRED
 * until sync had run at least once.
 */
function AuthenticatedApp() {
  const { getToken } = useAuth();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    syncAuth(getToken)
      .then(() => setReady(true))
      .catch((err) => setError(err.message));
  }, [getToken]);

  if (error) {
    return <p style={{ padding: "2rem", color: "crimson" }}>Sync failed: {error}</p>;
  }
  if (!ready) {
    return <p style={{ padding: "2rem" }}>Setting things up…</p>;
  }

  return <Dashboard />;
}