import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthProvider } from "@/lib/auth-context";
import { TodoProvider } from "@/lib/todo-context";
import { DashboardShell } from "@/components/todo/DashboardShell";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const authUser = {
    id: user.id,
    name: (user.user_metadata?.name as string) || user.email!.split("@")[0],
    email: user.email!,
  };

  return (
    <AuthProvider initialUser={authUser}>
      <TodoProvider>
        <DashboardShell />
      </TodoProvider>
    </AuthProvider>
  );
}
