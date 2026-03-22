import { redirect } from "next/navigation";

// Portfolio merged into Overview — redirects there
export default function PortfolioPage() {
  redirect("/dashboard");
}
