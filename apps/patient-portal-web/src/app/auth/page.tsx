"use client";
import dynamic from "next/dynamic";
import { AuthResumeWrapper } from "../../components/AuthResumeWrapper";
import useMsalRedirectResume from "../../hooks/useMsalRedirectResume";

const LoginFlow = dynamic(() => import("./components/LoginFlow"), { ssr: false });

export default function AuthPage() {
  useMsalRedirectResume();
  return (
    <AuthResumeWrapper>
      <LoginFlow />
    </AuthResumeWrapper>
  );
}