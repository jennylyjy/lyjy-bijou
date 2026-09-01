"use client";
import { useEffect, useState } from "react";

export default function GlobalAlert() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    const nativeAlert = window.alert;
    window.alert = (value?: unknown) => setMessage(String(value ?? ""));
    return () => { window.alert = nativeAlert; };
  }, []);
  if (!message) return null;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4" role="alertdialog" aria-modal="true">
    <div className="w-full max-w-md border border-[#C4A77D]/60 bg-stone-950 p-8 shadow-2xl">
      <h2 className="font-serif text-xl tracking-[0.15em] text-[#C4A77D]">LYJY Atelier</h2>
      <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-stone-200">{message}</p>
      <div className="mt-7 flex justify-end"><button type="button" onClick={() => setMessage(null)} className="border border-[#C4A77D] px-6 py-3 text-xs uppercase tracking-widest text-[#C4A77D] hover:bg-[#C4A77D] hover:text-black">OK</button></div>
    </div>
  </div>;
}
