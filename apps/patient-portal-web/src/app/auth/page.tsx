import dynamic from "next/dynamic";
import { AuthResumeWrapper } from "../../components/AuthResumeWrapper";

const SignupFlow = dynamic(() => import("./components/SignupFlow"), { ssr: false });

export default function AuthPage() {
  return (
    <AuthResumeWrapper>
      <main className="p-6">
        <SignupFlow />
      </main>
    </AuthResumeWrapper>
  );
}