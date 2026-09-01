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
      html: `<div style="font-family:Arial,sans-serif;color:#2b241d;max-width:620px;margin:auto;background:#fff;border:1px solid #e8e0d5"><div style="background:url('https://www.lyjy.fr/lyjy-banner-new.jpg') center/cover;padding:28px;text-align:center"><img src="https://www.lyjy.fr/logo.png" alt="LYJY" style="width:110px;background:#fff;padding:8px" /></div><div style="padding:32px"><p style="font-family:Georgia,serif;font-size:18px">Bonjour ${firstName || ""},</p><p style="line-height:1.7">Bienvenue chez LYJY ! Nous sommes ravis de vous compter parmi nous. Découvrez nos créations artisanales imaginées et réalisées avec passion.</p><p>À très bientôt,<br><strong>Jennifer – Votre conseillère LYJY</strong></p><hr><p style="font-size:12px;color:#756a5c">Contact : contact-lyjy@lyjy.fr · Réclamations : reclamation@lyjy.fr<br><a href="https://www.lyjy.fr">www.lyjy.fr</a></p></div></div>`,
      text: `Bonjour ${firstName || ""},\n\nBienvenue chez LYJY !\n\nCordialement,\nJennifer – Votre conseillère LYJY\ncontact-lyjy@lyjy.fr`,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Envoi impossible" }, { status: 502 });
  }
}
