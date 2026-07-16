import { redirect } from "next/navigation";

// Shift detail/close is now shown as a modal from the Kassa shifts list.
export default function ShiftDetailPage() {
  redirect("/kassa");
}
