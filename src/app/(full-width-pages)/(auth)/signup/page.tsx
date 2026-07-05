import BusinessRegisterForm from "@/components/auth/BusinessRegisterForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ro'yxatdan o'tish | KPOS",
  description: "Bepul biznes akkaunt yarating va sotuvni boshlang.",
};

export default function SignUp() {
  return <BusinessRegisterForm />;
}
