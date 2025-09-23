"use client";
import dynamic from "next/dynamic";
import { AuthResumeWrapper } from "../../components/AuthResumeWrapper";
import useMsalRedirectResume from "../../hooks/useMsalRedirectResume";

const SignupFlow = dynamic(() => import("./components/SignupFlow"), { ssr: false });

export default function AuthPage() {
  useMsalRedirectResume();
  return (
    <AuthResumeWrapper>
      <main className="p-6">
        <SignupFlow />
      </main>
    </AuthResumeWrapper>
  );
}