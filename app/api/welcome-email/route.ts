import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const { email, firstName } = await request.json();
    if (typeof email !== "string" || !email.includes("@")) return NextResponse.json({ error: "Adresse invalide" }, { status: 400 });
    const key = process.env.RESEND_API_KEY;
    if (!key) return NextResponse.json({ error: "Service e-mail indisponible" }, { status: 503 });
    await new Resend(key).emails.send({
      from: process.env.RESEND_FROM_EMAIL || "LYJY <onboarding@resend.dev>",
      to: email.trim().toLowerCase(),
      subject: "Bienvenue dans l’univers LYJY ✨",
      text: `Bonjour ${firstName || ""},\n\nBienvenue chez LYJY ! Nous sommes ravis de vous compter parmi nous. Découvrez nos créations artisanales imaginées et réalisées avec passion.\n\nÀ très bientôt,\nJennifer – LYJY Atelier Bijoux`,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Envoi impossible" }, { status: 502 });
  }
}
