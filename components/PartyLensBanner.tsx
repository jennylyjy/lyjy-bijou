"use client";
import { usePathname } from "next/navigation";

export default function PartyLensBanner() {
  const pathname = usePathname();
  if (pathname === "/" || pathname.startsWith("/admin")) return null;
  return <>
    <style>{`.partylens-ad{display:block;position:relative;overflow:hidden;height:92px;color:#fff;text-decoration:none;background:linear-gradient(110deg,#090311,#441052,#090311);background-size:250%;animation:plbg 6s infinite}.partylens-ad .plinside{position:relative;z-index:1;height:100%;display:flex;align-items:center;gap:18px;padding:10px 5vw}.partylens-ad img{width:82px;animation:plpop 2s infinite}.partylens-ad .plcopy{flex:1}.partylens-ad .plkicker{margin:0;color:#ffc078;font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase}.partylens-ad h2{margin:3px 0;font-size:clamp(17px,3vw,28px);font-weight:900;line-height:1.05;text-shadow:0 0 18px #ff2999}.partylens-ad .plservices{margin:4px 0 0;font-size:11px;font-weight:700}.partylens-ad .plbutton{padding:12px 16px;border-radius:10px;background:linear-gradient(90deg,#ff7800,#ff168f);font-weight:900;white-space:nowrap;animation:plpulse 1.5s infinite}@keyframes plbg{50%{background-position:100%}}@keyframes plpop{50%{transform:scale(1.08) rotate(-3deg)}}@keyframes plpulse{50%{transform:scale(1.05);box-shadow:0 0 22px #ff168f}}@media(max-width:650px){.partylens-ad{height:78px}.partylens-ad .plinside{gap:8px;padding:8px 12px}.partylens-ad img{width:58px}.partylens-ad .plkicker{font-size:8px}.partylens-ad h2{font-size:16px}.partylens-ad .plservices{font-size:9px}.partylens-ad .plbutton{padding:9px;font-size:10px}}`}</style>
    <a className="partylens-ad" href="https://www.partylens.fr/register?demo=true" target="_blank" rel="noopener noreferrer"><div className="plinside"><img src="https://www.partylens.fr/logo-partylens.png" alt="PartyLens" /><div className="plcopy"><p className="plkicker">🔥 L’animation qui fait parler toute la soirée</p><h2>Le photobooth qui déclenche le « WAAAHOU ».</h2><p className="plservices">📸 Photobooth · 🖼️ Galerie photo live · 🎙️ Livre d’or audio · ⚡ QR code</p></div><span className="plbutton">Je veux ça pour ma soirée →</span></div></a>
  </>;
}
