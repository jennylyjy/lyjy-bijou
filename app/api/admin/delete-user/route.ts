import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const adminAuth = getAdminAuth();
    const caller = await adminAuth.verifyIdToken(token);
    const allowed = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
    if (!caller.email || (allowed?.length ? !allowed.includes(caller.email.toLowerCase()) : !caller.email.toLowerCase().endsWith("@lyjy.fr"))) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    const { uid } = await request.json();
    if (!uid || typeof uid !== "string") return NextResponse.json({ error: "UID invalide" }, { status: 400 });
    await adminAuth.deleteUser(uid);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Suppression impossible" }, { status: 500 });
  }
}
