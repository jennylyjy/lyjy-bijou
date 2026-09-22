import Link from "next/link";
const questions = [
  ["Comment passer une commande ?", "Ajoutez vos articles au panier, renseignez vos coordonnées et choisissez votre mode de livraison et de paiement."],
  ["Quels sont les délais de livraison ?", "Les délais sont indiqués au moment de la commande et peuvent varier selon le mode de livraison choisi."],
  ["Puis-je retourner un article ?", "Contactez-nous depuis la page Contact en indiquant votre numéro de commande afin que nous vous guidions dans la procédure."],
  ["Comment suivre ma commande ?", "Connectez-vous à votre compte pour consulter l’état de vos commandes et les informations de suivi lorsqu’elles sont disponibles."],
  ["Comment utiliser mes points fidélité ?", "Vos points disponibles sont affichés dans votre compte et peuvent être proposés au moment du paiement."],
];
export default function FaqPage() { return <main className="min-h-screen bg-black px-6 py-10 text-stone-200"><div className="mx-auto max-w-3xl"><Link href="/boutique" className="text-sm text-[#C4A77D]">← Retour boutique</Link><h1 className="my-10 text-center font-serif text-4xl text-[#C4A77D]">Questions fréquentes</h1><div className="space-y-3">{questions.map(([question, answer]) => <details key={question} className="border border-stone-800 p-5"><summary className="cursor-pointer font-serif text-lg text-[#C4A77D]">{question}</summary><p className="mt-3 text-sm leading-7 text-stone-400">{answer}</p></details>)}</div></div></main>; }
