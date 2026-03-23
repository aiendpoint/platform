import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/components/RegisterForm";

export const metadata: Metadata = {
  title: "Register — AIEndpoint",
  description: "Register your web service in the AIEndpoint registry. We validate your /ai endpoint and add it to the directory.",
  alternates: { canonical: "/register" },
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-6 py-16"><div className="h-8 w-64 bg-canvas rounded animate-pulse" /></div>}>
      <RegisterForm />
    </Suspense>
  );
}
