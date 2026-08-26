import { NextResponse } from "next/server";

const SENDCLOUD_URL = "https://panel.sendcloud.sc/api/v2/shipping_methods";

export async function GET(request: Request) {
  const publicKey = process.env.SENDCLOUD_PUBLIC_KEY;
  const secretKey = process.env.SENDCLOUD_SECRET_KEY;
  if (!publicKey || !secretKey) return NextResponse.json({ error: "Sendcloud non configuré" }, { status: 503 });

  const incoming = new URL(request.url);
  const params = new URLSearchParams();
  for (const key of ["sender_address", "service_point_id", "is_return"]) {
    const value = incoming.searchParams.get(key);
    if (value) params.set(key, value.slice(0, 64));
  }

  try {
    const response = await fetch(`${SENDCLOUD_URL}?${params}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString("base64")}` },
      next: { revalidate: 300 },
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: "Sendcloud a refusé la requête" }, { status: response.status });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Service Sendcloud indisponible" }, { status: 502 });
  }
}
