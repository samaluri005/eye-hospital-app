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
    <div className="mt-4">
      <button onClick={callApi} className="px-3 py-2 bg-blue-600 text-white">Call protected /api/patient</button>
      <pre>{JSON.stringify(res, null, 2)}</pre>
    </div>
  );
}