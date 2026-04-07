import { redirect } from "next/navigation";

// /build is deprecated — redirect to /signup (invite gate)
export default function BuildPage() {
  redirect("/signup");
}
