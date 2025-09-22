"use client";
import axios from "axios";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../../../lib/msalConfig";
import React, { useState } from "react";

export default function TestApi() {
  const { instance } = useMsal();
  const [res, setRes] = useState<any>(null);
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL;

  async function callApi() {
    const account = instance.getAllAccounts()[0];
    const tokenResp = await instance.acquireTokenSilent({ ...loginRequest, account }).catch(()=> instance.acquireTokenPopup(loginRequest));
    const atk = tokenResp.accessToken;
    const r = await axios.get(`${backend}/api/patient`, { headers: { Authorization: `Bearer ${atk}` }});
    setRes(r.data);
  }

  return (
    <div className="space-y-4">
      <button 
        onClick={callApi} 
        className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 w-full flex items-center justify-center space-x-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span>Call protected /api/patient</span>
      </button>
      {res && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">API Response:</h4>
          <pre className="text-xs text-gray-600 overflow-auto">{JSON.stringify(res, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}