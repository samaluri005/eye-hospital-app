"use client";

import React from "react";
import { useMsalRedirectResume } from "../hooks/useMsalRedirectResume";

export function AuthResumeWrapper({ children }: { children: React.ReactNode }) {
  useMsalRedirectResume();
  return <>{children}</>;
}