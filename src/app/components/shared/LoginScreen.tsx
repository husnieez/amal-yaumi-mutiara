import { useState } from "react";
import { UserRecord } from "../../lib/db";
import { Moon, AlertCircle } from "lucide-react";

export function LoginScreen({
  onLogin,
  users,
}: {
  onLogin: (u: UserRecord) => void;
  users: UserRecord[];
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase().trim());
    if (u) {
      setError("");
      onLogin(u);
    } else {
      setError("Email not found. Please contact an administrator.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 transition-colors duration-300" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-card border border-primary/30 mb-4 shadow-sm">
            <Moon className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <h1 className="text-3xl font-light text-foreground mb-1" style={{ fontFamily: "'Crimson Pro', serif" }}>Amal Tracker</h1>
          <p className="text-sm text-muted-foreground font-light">Daily spiritual practice record</p>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden p-6">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-900/10 border border-red-700/20 rounded p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!email.trim()}
              className="w-full py-2.5 mt-2 rounded bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/95 transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
            >
              Sign In
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8 font-mono">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
      </div>
    </div>
  );
}
