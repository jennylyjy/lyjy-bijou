import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !["claim", "contact"].includes(body.type) || !body.firstName || !body.lastName || !body.email || !body.message || (body.type === "claim" && !body.orderNumber)) return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return NextResponse.json({ error: "E-mail invalide" }, { status: 400 });
  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ error: "Service e-mail non configuré" }, { status: 503 });
  const to = body.type === "claim" ? "reclamation@lyjy.fr" : "contact-lyjy@lyjy.fr";
  const subject = body.type === "claim" ? `Réclamation commande ${body.orderNumber}` : `Contact de ${body.firstName} ${body.lastName}`;
  try { await new Resend(key).emails.send({ from: process.env.RESEND_FROM_EMAIL || "LYJY <onboarding@resend.dev>", to, replyTo: body.email, subject, text: `Nom : ${body.firstName} ${body.lastName}\nE-mail : ${body.email}\n${body.orderNumber ? `Commande : ${body.orderNumber}\n` : ""}\n${body.message}` }); return NextResponse.json({ ok: true }); } catch { return NextResponse.json({ error: "Envoi impossible" }, { status: 502 }); }
}
