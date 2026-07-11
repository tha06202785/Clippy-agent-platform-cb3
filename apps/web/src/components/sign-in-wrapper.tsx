"use client";
import dynamic from "next/dynamic";

const SignInModal = dynamic(
  () => import("./sign-in-modal"),
  { ssr: false }
);

export function SignInWrapper() {
  return <SignInModal />;
}
