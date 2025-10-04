"use client";
import dynamic from "next/dynamic";
import AuthMsalProvider from "./components/AuthMsalProvider";
import useMsalRedirectResume from "../../hooks/useMsalRedirectResume";

const SignupFlow = dynamic(() => import("./components/SignupFlow"), { ssr: false });

function AuthContent() {
  useMsalRedirectResume();
  return (
    <main className="p-6">
      <SignupFlow />
    </main>
  );
}

export default function AuthPage() {
  return (
    <AuthMsalProvider>
      <AuthContent />
    </AuthMsalProvider>
  );
}
