import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const publicKey = process.env.SENDCLOUD_PUBLIC_KEY;
  const secretKey = process.env.SENDCLOUD_SECRET_KEY;
  const source = new URL(request.url).searchParams;
  const postalCode = (source.get("postal_code") || "").trim().slice(0, 12);
  const country = (source.get("country") || "FR").toUpperCase();
  const carrier = source.get("carrier");
  if (!publicKey || !secretKey) return NextResponse.json({ error: "Sendcloud non configuré" }, { status: 503 });
  if (!postalCode || !/^[A-Z]{2}$/.test(country)) return NextResponse.json({ error: "Code postal invalide" }, { status: 400 });
  const params = new URLSearchParams({ country, address: postalCode, radius: "10000" });
  if (carrier && /^(mondialrelay|colissimo|laposte)(,(mondialrelay|colissimo|laposte))*$/i.test(carrier)) params.set("carrier", carrier);
  try {
    const response = await fetch(`https://servicepoints.sendcloud.sc/api/v2/service-points?${params}`, { headers: { Authorization: `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString("base64")}` }, next: { revalidate: 300 } });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: "Recherche de relais indisponible" }, { status: response.status });
    return NextResponse.json(data);
  } catch { return NextResponse.json({ error: "Service Sendcloud indisponible" }, { status: 502 }); }
}
