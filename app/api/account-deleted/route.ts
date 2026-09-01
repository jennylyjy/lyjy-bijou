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
      html: `<div style="font-family:Arial,sans-serif;color:#2b241d;max-width:620px;margin:auto;background:#fff;border:1px solid #e8e0d5"><div style="background:url('https://www.lyjy.fr/lyjy-banner-new.jpg') center/cover;padding:25px;text-align:center"><img src="https://www.lyjy.fr/logo.png" alt="LYJY" style="width:100px;background:#fff;padding:8px" /></div><div style="padding:32px"><p>Votre compte LYJY a bien été supprimé à votre demande.</p><p>Cordialement,<br><strong>Votre conseillère LYJY</strong></p><hr><small>contact-lyjy@lyjy.fr · reclamation@lyjy.fr</small></div></div>`,
      text: "Votre compte LYJY a bien été supprimé à votre demande.\n\nCordialement,\nVotre conseillère LYJY\ncontact-lyjy@lyjy.fr · reclamation@lyjy.fr",
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Envoi impossible" }, { status: 502 });
  }
}
