"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export const signIn = async (formData: FormData) => {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const redirectTo = String(formData.get("redirect") ?? "/dashboard")

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  redirect(redirectTo.startsWith("/") ? redirectTo : "/dashboard")
}

export const signUp = async (formData: FormData) => {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const displayName = String(formData.get("displayName") ?? "").trim()

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || email.split("@")[0],
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (!data.session) {
    return {
      message:
        "Account created. Check your email to confirm your address before signing in.",
    }
  }

  redirect("/dashboard")
}

export const signOut = async () => {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
