import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  // Check if user has completed onboarding
  if (session.user.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { onboardingCompleted: true },
    });

    if (user && !user.onboardingCompleted) {
      redirect("/onboarding");
    }
  }

  return <AppShell>{children}</AppShell>;
}
