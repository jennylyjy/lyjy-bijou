import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(token);
    await adminAuth.deleteUser(decoded.uid);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Suppression impossible" }, { status: 500 });
  }
}
