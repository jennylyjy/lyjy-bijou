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
      html: `<div style="font-family:Arial;color:#2b241d;max-width:620px;margin:auto"><div style="background:url('https://www.lyjy.fr/lyjy-banner-new.jpg') center/cover;padding:25px;text-align:center"><img src="https://www.lyjy.fr/logo.png" alt="LYJY" style="width:100px;background:#fff;padding:8px" /></div><div style="padding:28px"><p>Votre compte LYJY a bien été supprimé à votre demande.</p><p>Vos données de profil ne sont plus accessibles.</p><p>Cordialement,<br><strong>Votre conseillère LYJY</strong></p><hr><small>LYJY Atelier Bijoux · 85130 Tiffauges<br>contact-lyjy@lyjy.fr · reclamation@lyjy.fr</small></div></div>`,
      text: "Votre compte LYJY a bien été supprimé à votre demande.\n\nCordialement,\nVotre conseillère LYJY\nLYJY Atelier Bijoux · 85130 Tiffauges\ncontact-lyjy@lyjy.fr",
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Envoi impossible" }, { status: 502 });
  }
}
