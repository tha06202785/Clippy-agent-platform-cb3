import { supabase } from "./supabase";

export async function getCurrentUser() {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error getting session:", sessionError);
      return null;
    }

    if (!session) {
      console.log("No active session found");
      return null;
    }

    console.log("Current user:", session.user);
    return session.user;
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    return null;
  }
}

export async function getUserProfile() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log("No user logged in");
      return null;
    }

    // Try to fetch user profile from profiles table (if it exists)
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.log("No profile found in database (this is normal for new users):", error.message);
      return { user };
    }

    return { user, profile: data };
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    return null;
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error in signOut:", error);
    return false;
  }
}

// Log auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log("Auth state changed:", event);
  if (session?.user) {
    console.log("User email:", session.user.email);
    console.log("User ID:", session.user.id);
  }
});
