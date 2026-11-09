import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { ForgotPasswordForm } from "./forgot-form";

export const metadata: Metadata = pageMetadata({
  title: "Reset your password",
  description: "Forgot your Bright Horizon Institute password? Enter your account email and we'll send a 6-digit code to reset it.",
  path: "/forgot-password",
  banner: "password",
});

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
