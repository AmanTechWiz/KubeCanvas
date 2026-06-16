import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div
        className="hidden lg:flex items-center justify-center p-12"
        style={{ backgroundColor: "var(--bg-surface)" }}
      >
        <div className="max-w-sm">
          <h1
            className="mb-3 text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            KubeCanvas
          </h1>
          <p
            className="mb-6 text-sm leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            Real-time collaborative system design workspace
          </p>
          <ul
            className="space-y-2 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            <li>Collaborative canvas with real-time presence</li>
            <li>AI-powered design generation</li>
            <li>Instant spec export</li>
          </ul>
        </div>
      </div>

      <div
        className="flex items-center justify-center p-6"
        style={{ backgroundColor: "var(--bg-elevated)" }}
      >
        <SignIn />
      </div>
    </div>
  );
}
