import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, dateOfBirth, gender, title } = body;

    if (!firstName || !lastName || !dateOfBirth) {
      return NextResponse.json(
        { isDuplicate: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const empiResponse = await axios.post(`${AUTH_SERVICE_URL}/empi/match`, {
      firstName: firstName.trim(),
      middleName: "",
      lastName: lastName.trim(),
      dob: dateOfBirth,
      gender: gender || "",
      phone: "",
      email: "",
      govtIdType: "",
      govtIdNumber: "",
    });

    const { decision, highestScore } = empiResponse.data;

    if (decision === 'block' || decision === 'review') {
      return NextResponse.json({
        isDuplicate: true,
        message: "A patient with similar information already exists",
        score: highestScore,
      });
    }

    return NextResponse.json({
      isDuplicate: false,
      message: "No duplicates found",
    });
  } catch (error: any) {
    console.error("EMPI check error:", error);
    
    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { isDuplicate: false, message: "EMPI service unavailable - proceeding with registration" },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { isDuplicate: false, message: "EMPI check failed - proceeding with registration" },
      { status: 200 }
    );
  }
}
