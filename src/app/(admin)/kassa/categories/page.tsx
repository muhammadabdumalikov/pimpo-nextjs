import { redirect } from "next/navigation";

// Operation categories are now managed under Finance (Moliya → Toifalar);
// the kassa-specific page was a duplicate of the same financial_categories.
export default function Page() {
  redirect("/finance/categories");
}
