import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getAuthBusinessId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.businessId || null;
}

export async function getAuthUser() {
  const session = await getServerSession(authOptions);
  return session?.user || null;
}

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");
  const businessId = (user as any).businessId;
  if (!businessId) throw new Error("No business assigned");
  return { user, businessId };
}
