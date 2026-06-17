import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "KubeCanvas — Real-time collaborative system design",
  description:
    "Design systems together. Describe a system in plain English, AI maps it onto a shared canvas, collaborators refine the architecture, and export a technical spec.",
};

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/editor");
  }

  return <LandingPage />;
}
