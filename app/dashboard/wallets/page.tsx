import { redirect } from "next/navigation";

// Wallets merged into Overview — redirects there
export default function WalletsPage() {
  redirect("/dashboard");
}
