"use client";

import { useEffect, useRef, useState } from "react";
import { collection, doc, onSnapshot, query, runTransaction, serverTimestamp, where } from "firebase/firestore";
import { Gift, Lock, Snowflake } from "lucide-react";
import { db } from "@/lib/firebase";

interface Reward {
  day: number;
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  minimumAmount?: number;
}

interface VirtualCalendar {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  rewards: Reward[];
}

interface Claim {
  calendarId: string;
  day: number;
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  minimumAmount?: number;
}

const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const rewardDateKey = (startDate: string, day: number) => {
  const date = new Date(`${startDate}T12:00:00`);
  date.setDate(date.getDate() + day - 1);
  return localDateKey(date);
};

function ScratchSurface({ onReveal }: { onReveal: () => Promise<void> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scratchingRef = useRef(false);
  const revealingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    context.fillStyle = "#b89b70";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#171717";
    context.font = "600 15px Arial";
    context.textAlign = "center";
    context.fillText("GRATTEZ ICI", canvas.width / 2, canvas.height / 2 + 5);
  }, []);

  const scratch = async (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context || revealingRef.current) return;

    const bounds = canvas.getBoundingClientRect();
    const x = (clientX - bounds.left) * (canvas.width / bounds.width);
    const y = (clientY - bounds.top) * (canvas.height / bounds.height);
    context.globalCompositeOperation = "destination-out";
    context.beginPath();
    context.arc(x, y, 18, 0, Math.PI * 2);
    context.fill();

    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparentPixels = 0;
    for (let index = 3; index < pixels.length; index += 16) {
      if (pixels[index] === 0) transparentPixels += 1;
    }

    if (transparentPixels / (pixels.length / 16) >= 0.42) {
      revealingRef.current = true;
      try {
        await onReveal();
        canvas.style.display = "none";
      } catch {
        revealingRef.current = false;
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={260}
      height={150}
      className="absolute inset-0 h-full w-full touch-none cursor-crosshair"
      onPointerDown={(event) => {
        scratchingRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        void scratch(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (scratchingRef.current) void scratch(event.clientX, event.clientY);
      }}
      onPointerUp={() => { scratchingRef.current = false; }}
      onPointerCancel={() => { scratchingRef.current = false; }}
      aria-label="Gratter la case du jour"
    />
  );
}

export default function VirtualAdventCalendar({ userEmail, isDayMode }: { userEmail: string; isDayMode: boolean }) {
  const [calendars, setCalendars] = useState<VirtualCalendar[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [error, setError] = useState("");

  useEffect(() => onSnapshot(
    query(collection(db, "virtualAdventCalendars"), where("isActive", "==", true)),
    snapshot => setCalendars(snapshot.docs.map(calendarDoc => ({
      id: calendarDoc.id,
      ...calendarDoc.data(),
    })) as VirtualCalendar[])
  ), []);

  useEffect(() => onSnapshot(
    query(collection(db, "virtualAdventClaims"), where("userEmail", "==", userEmail.toLowerCase())),
    snapshot => setClaims(snapshot.docs.map(claimDoc => claimDoc.data() as Claim))
  ), [userEmail]);

  const today = localDateKey();
  // N'afficher qu'un calendrier réellement en cours. L'ancien comportement
  // reprenait le dernier calendrier même après sa date de fin, ce qui le
  // rendait encore visible côté client alors qu'il n'était plus disponible.
  const calendar = [...calendars]
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .find(item => item.isActive && today >= item.startDate && today <= item.endDate);

  if (!calendar) {
    return <p className="text-xs text-stone-500">Aucun calendrier virtuel n&apos;est disponible actuellement.</p>;
  }

  const revealReward = async (reward: Reward) => {
    setError("");
    if (rewardDateKey(calendar.startDate, reward.day) !== localDateKey()) {
      setError("Seule la case du jour peut être grattée.");
      throw new Error("Case verrouillée");
    }

    const claimId = `${calendar.id}_${encodeURIComponent(userEmail.toLowerCase())}_${reward.day}`;
    const claimRef = doc(db, "virtualAdventClaims", claimId);
    await runTransaction(db, async transaction => {
      const existingClaim = await transaction.get(claimRef);
      if (existingClaim.exists()) return;

      transaction.set(claimRef, {
        calendarId: calendar.id,
        userEmail: userEmail.toLowerCase(),
        day: reward.day,
        code: reward.code,
        discountType: reward.discountType,
        discountValue: reward.discountValue,
        minimumAmount: reward.minimumAmount || 0,
        claimedAt: serverTimestamp(),
      });
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl tracking-[0.2em] text-[#C4A77D] flex items-center gap-2">
          <Gift className="w-5 h-5" /> {calendar.title}
        </h2>
        <p className="mt-2 text-xs text-stone-500">
          Grattez uniquement la case du jour. Une case oubliée ne peut pas être récupérée le lendemain.
        </p>
      </div>

      {error && <p className="border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">{error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {calendar.rewards.map(reward => {
          const dateKey = rewardDateKey(calendar.startDate, reward.day);
          const claim = claims.find(item => item.calendarId === calendar.id && item.day === reward.day);
          const isToday = dateKey === today;
          const isMissed = dateKey < today && !claim;
          const isFuture = dateKey > today;

          return (
            <div
              key={reward.day}
              className={`relative min-h-36 overflow-hidden border p-4 text-center flex flex-col items-center justify-center ${
                claim
                  ? "border-green-500/40 bg-green-500/10"
                  : isToday
                    ? "border-[#C4A77D] bg-[#C4A77D]/10"
                    : isDayMode ? "border-stone-300 bg-white" : "border-stone-800 bg-black"
              }`}
            >
              <span className="absolute left-2 top-2 font-serif text-lg text-[#C4A77D]">{reward.day}</span>

              {claim ? (
                <>
                  <Gift className="mb-2 h-5 w-5 text-green-400" />
                  <span className="text-xs text-green-400">
                    {claim.discountValue}{claim.discountType === "percent" ? "%" : " €"} de réduction
                  </span>
                  <strong className="mt-2 font-mono text-sm text-[#C4A77D]">{claim.code}</strong>
                  {(claim.minimumAmount || 0) > 0 && (
                    <span className="mt-1 text-[9px] text-stone-500">Dès {claim.minimumAmount} €</span>
                  )}
                </>
              ) : isToday ? (
                <>
                  <Snowflake className="h-6 w-6 text-[#C4A77D]" />
                  <span className="mt-2 text-[10px] uppercase tracking-wider text-[#C4A77D]">Case du jour</span>
                  <ScratchSurface onReveal={() => revealReward(reward)} />
                </>
              ) : (
                <>
                  <Lock className="mb-2 h-5 w-5 text-stone-500" />
                  <span className="text-[10px] uppercase tracking-wider text-stone-500">
                    {isMissed ? "Case manquée" : isFuture ? "Bientôt" : "Indisponible"}
                  </span>
                  <span className="mt-1 text-[9px] text-stone-600">{new Date(`${dateKey}T12:00:00`).toLocaleDateString("fr-FR")}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
