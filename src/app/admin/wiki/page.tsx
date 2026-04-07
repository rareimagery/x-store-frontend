import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import WikiClient from "./WikiClient";

export const metadata = {
  title: "Platform Wiki — RareImagery Admin",
};

export default async function AdminWikiPage() {
  const session = await getServerSession(authOptions) as any;
  if (!session || session.role !== "admin") {
    redirect("/login");
  }

  return <WikiClient />;
}
