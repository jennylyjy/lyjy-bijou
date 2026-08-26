import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const publicKey = process.env.SENDCLOUD_PUBLIC_KEY;
  const secretKey = process.env.SENDCLOUD_SECRET_KEY;
  const source = new URL(request.url).searchParams;
  const methodId = source.get("shipping_method_id");
  const weight = Number(source.get("weight"));
  const toCountry = (source.get("to_country") || "FR").toUpperCase();
  if (!publicKey || !secretKey) return NextResponse.json({ error: "Sendcloud non configuré" }, { status: 503 });
  if (!methodId || !/^\d+$/.test(methodId) || !Number.isFinite(weight) || weight <= 0 || weight > 100000 || !/^[A-Z]{2}$/.test(toCountry)) {
    return NextResponse.json({ error: "Paramètres de livraison invalides" }, { status: 400 });
  }
  const params = new URLSearchParams({ shipping_method_id: methodId, weight: String(weight), weight_unit: "gram", from_country: "FR", to_country: toCountry });
  try {
    const response = await fetch(`https://panel.sendcloud.sc/api/v2/shipping-price?${params}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString("base64")}` },
      next: { revalidate: 60 },
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: "Tarif Sendcloud indisponible" }, { status: response.status });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Service Sendcloud indisponible" }, { status: 502 });
  }
}
