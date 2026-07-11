"use client";
import { SignIn, ClerkProvider } from "@clerk/nextjs";

export default function SignInForm() {
  return (
    <ClerkProvider>
      <SignIn />
    </ClerkProvider>
  );
}
