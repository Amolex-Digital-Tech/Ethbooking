import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const profile = await prisma.profile.findUnique({
    where: {
      authUserId: user.id,
    },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!profile) {
    return null;
  }

  return {
    authUser: user,
    profile,
    roles: profile.userRoles.map((userRole) => userRole.role.name),
  };
}
