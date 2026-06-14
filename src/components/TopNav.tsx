import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function TopNav() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  return (
    <nav className="nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
        <Link href="/" className="nav-logo">
          <span className="nav-logo-icon">💸</span>
          FlatSplit
        </Link>
        <Link href="/" className="nav-link">Dashboard</Link>
        <Link href="/import" className="nav-link">Import CSV</Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ fontSize: 13, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="avatar" style={{ background: "var(--accent)", width: 24, height: 24, fontSize: 11 }}>
            {session.user.name?.[0]?.toUpperCase()}
          </span>
          {session.user.name}
        </div>
        <form action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}>
          <button type="submit" className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>Sign Out</button>
        </form>
        <Link href="/add-expense" className="btn btn-primary" style={{ padding: "7px 16px", fontSize: 13 }}>+ Add Expense</Link>
      </div>
    </nav>
  );
}
