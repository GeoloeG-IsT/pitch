"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(
  _prevState: { error: string } | null,
  formData: FormData
) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  // Create public.users profile — invite links force investor, otherwise use selected role
  if (data.user) {
    const invite = formData.get("invite") as string | null;
    const selectedRole = formData.get("role") as string | null;
    const role = invite ? "investor" : (selectedRole || "founder");
    await supabase.from("users").insert({
      id: data.user.id,
      email: data.user.email,
      role,
    });
  }

  redirect("/dashboard");
}
