import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Stripe non configuré" }, { status: 503 });
  const body = await request.json().catch(() => null);
  if (!body?.items?.length) return NextResponse.json({ error: "Panier vide" }, { status: 400 });
  const stripe = new Stripe(secret);
  const session = await stripe.checkout.sessions.create({ mode: "payment", line_items: body.items.slice(0, 50).map((item: { name?: string; price?: number; quantity?: number }) => ({ price_data: { currency: "eur", product_data: { name: String(item.name || "Article").slice(0, 120) }, unit_amount: Math.round(Math.max(0, Number(item.price) || 0) * 100) }, quantity: Math.max(1, Math.min(99, Number(item.quantity) || 1)) })), success_url: `${new URL(request.url).origin}/order-success?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${new URL(request.url).origin}/panier` });
  return NextResponse.json({ url: session.url });
}
