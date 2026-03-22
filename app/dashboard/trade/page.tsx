import { redirect } from "next/navigation";

// Trade page removed — redirects to dashboard overview
export default function TradePage() {
  redirect("/dashboard");
}
