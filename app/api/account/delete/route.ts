import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(token);
    const body = await request.json();
    if (typeof body.email !== "string" || body.email.trim().toLowerCase() !== String(decoded.email || "").toLowerCase()) {
      return NextResponse.json({ error: "Le compte connecté ne correspond pas à l’adresse demandée" }, { status: 403 });
    }
    await getAdminDb().collection("users").doc(decoded.uid).delete();
    await adminAuth.deleteUser(decoded.uid);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Suppression impossible" }, { status: 500 });
  }
}
