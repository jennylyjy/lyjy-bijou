import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (typeof email !== "string" || !email.includes("@")) return NextResponse.json({ error: "Adresse invalide" }, { status: 400 });
    const key = process.env.RESEND_API_KEY;
    if (!key) return NextResponse.json({ error: "Service e-mail indisponible" }, { status: 503 });
    await new Resend(key).emails.send({
      from: process.env.RESEND_FROM_EMAIL || "LYJY <onboarding@resend.dev>",
      to: email.trim().toLowerCase(),
      subject: "Confirmation de suppression de votre compte LYJY",
      text: "Votre compte LYJY a bien été supprimé à votre demande. Vos données de profil ne sont plus accessibles. Nous restons disponibles par e-mail pour toute question.",
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Envoi impossible" }, { status: 502 });
  }
}
