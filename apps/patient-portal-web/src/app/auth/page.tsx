"use client";
import dynamic from "next/dynamic";
import AuthMsalProvider from "./components/AuthMsalProvider";
import useMsalRedirectResume from "../../hooks/useMsalRedirectResume";

const EnhancedAuthFlow = dynamic(() => import("./components/EnhancedAuthFlow"), { 
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        {/* Trendy Spinner */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-600 animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-emerald-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
        </div>
        <p className="text-gray-600 font-medium animate-pulse">Loading...</p>
      </div>
    </div>
  )
});

function AuthContent() {
  useMsalRedirectResume();
  return <EnhancedAuthFlow />;
}

export default function AuthPage() {
  return (
    <AuthMsalProvider>
      <AuthContent />
    </AuthMsalProvider>
  );
}
