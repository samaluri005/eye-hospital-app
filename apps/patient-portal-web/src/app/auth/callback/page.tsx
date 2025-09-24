"use client";
import { useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const { instance } = useMsal();
  const router = useRouter();

  useEffect(() => {
    // Handle the redirect response from Microsoft
    instance.handleRedirectPromise()
      .then((response) => {
        if (response) {
          console.log("Microsoft redirect authentication successful");
          // Redirect back to auth page
          router.push("/auth");
        } else {
          console.log("No response from redirect");
          router.push("/auth");
        }
      })
      .catch((error) => {
        console.error("Microsoft redirect authentication failed:", error);
        router.push("/auth");
      });
  }, [instance, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Processing Microsoft authentication...</p>
      </div>
    </div>
  );
}