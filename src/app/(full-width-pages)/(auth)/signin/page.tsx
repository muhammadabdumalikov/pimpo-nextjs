import BusinessLoginForm from "@/components/auth/BusinessLoginForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Login | Pimpo CRM",
  description: "Login to your business account",
};

export default function SignIn() {
  return <BusinessLoginForm />;
}
