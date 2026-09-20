import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const { email, firstName, token } = await request.json();
    if (typeof email !== "string" || !email.includes("@") || typeof token !== "string") return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.lyjy.fr";
    const link = `${origin}/inscription?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(email.trim().toLowerCase())}`;
    const key = process.env.RESEND_API_KEY;
    if (!key) return NextResponse.json({ error: "Service e-mail indisponible" }, { status: 503 });
    const year = new Date().getFullYear();
    await new Resend(key).emails.send({
      from: process.env.RESEND_FROM_EMAIL || "LYJY <onboarding@resend.dev>", to: email.trim().toLowerCase(), subject: "Créez votre compte LYJY Atelier ✨",
      html: `<div style="font-family:Arial,sans-serif;color:#eee;max-width:620px;margin:auto;background:#171313"><div style="background:#0b0909;padding:28px;text-align:center"><img src="${origin}/logo.png" alt="LYJY" style="width:130px;background:#fff;padding:8px" /></div><div style="padding:34px"><p style="font-family:Georgia,serif;font-size:20px;color:#c4a77d">Bonjour ${firstName || ""},</p><p style="line-height:1.7">Merci pour votre achat chez LYJY Atelier. Votre compte client vous permettra de retrouver vos points fidélité et vos commandes.</p><p style="line-height:1.7">Cliquez sur le bouton ci-dessous pour choisir votre mot de passe et activer votre compte.</p><p style="text-align:center;margin:32px 0"><a href="${link}" style="background:#c4a77d;color:#111;padding:15px 26px;text-decoration:none;display:inline-block">Créer mon mot de passe</a></p><hr style="border:0;border-top:1px solid #4b4038"><p style="font-size:12px;color:#aaa;text-align:center">© ${year} LYJY Atelier · www.lyjy.fr</p></div></div>`,
      text: `Bonjour ${firstName || ""},\n\nCréez votre mot de passe LYJY ici : ${link}`,
    });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Envoi impossible" }, { status: 502 }); }
}
