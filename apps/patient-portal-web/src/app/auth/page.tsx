import dynamic from "next/dynamic";
const SignupFlow = dynamic(() => import("./components/SignupFlow"), { ssr: false });

export default function AuthPage() {
  return (
    <main className="p-6">
      <SignupFlow />
    </main>
  );
}