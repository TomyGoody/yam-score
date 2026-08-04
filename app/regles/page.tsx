"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import AuthButton from "../components/AuthButton";

export default function RulesPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-dvh overflow-hidden bg-black px-4 py-8 text-white">
      
        <AuthButton />
      

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
        <Image
          src="/favicon.png"
          alt=""
          width={1000}
          height={1000}
          priority
          className="rotate-[-12deg] select-none"
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-xl border border-[#9B6A28]/60 bg-black px-4 py-2 font-black text-white transition hover:bg-[#241A13]"
        >
          Accueil
        </button>

        <header className="mt-10 text-center">
          <div className="text-6xl">📖</div>

          <p className="mt-4 text-sm font-black uppercase tracking-[0.3em] text-[#C44934]">
            YamScore
          </p>

          <h1 className="mt-2 text-5xl font-black sm:text-6xl">
            Règles du jeu
          </h1>

          <p className="mx-auto mt-4 max-w-2xl font-bold text-slate-400">
            Retrouve le fonctionnement des colonnes, les figures et le calcul
            des scores.
          </p>
        </header>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <RuleCard
            title="🎯 But du jeu"
            content="Obtenir le score total le plus élevé en remplissant toutes les cases de sa feuille."
          />

          <RuleCard
            title="⏳ Déroulement"
            content="À chaque tour, un joueur remplit une seule case. La partie se termine lorsque toutes les cases de tous les joueurs sont complétées."
          />

          <RuleCard
            title="⋮ Colonnes"
            content="Les colonnes descendantes se remplissent du haut vers le bas. Les colonnes montantes se remplissent du bas vers le haut. Les colonnes libres peuvent être jouées dans n’importe quel ordre."
          />

          <RuleCard
            title="🎁 Bonus supérieur"
            content="Un bonus de 35 points est accordé lorsqu’une colonne atteint au moins 60 points dans la partie supérieure."
          />
          <RuleCard
  title="1️⃣ Premier joueur"
  content="Avant chaque partie, chaque joueur lance un dé. Celui qui obtient le plus petit chiffre commence. En cas d'égalité, les joueurs concernés relancent jusqu'à ce qu'un ordre soit déterminé. Dans les modes spéciaux, ce tirage est effectué avant chaque nouvelle partie."
/>
<RuleCard
  title="🏆 Modes spéciaux"
  content="Les modes spéciaux proposent des compétitions composées de plusieurs parties. Les joueurs s'affrontent jusqu'à atteindre le nombre de victoires requis. L'ordre du premier joueur est redéterminé avant chaque nouvelle partie."
/>
<RuleCard
            title="➕/➖ Plus et Moins"
            content="Il est impératif d'avoir un score 'Moins' inférieur à un score 'Plus' dans la même colonne. Si un joueur n'y parvient pas, il obtient un malus de - 50 et sa case est annulée."
          />
        </div>

        <section className="mt-6 rounded-3xl border border-[#9B6A28]/50 bg-[#111111] p-6">
          <p className="text-sm font-black uppercase tracking-widest text-[#C44934]">
            Figures
          </p>

          <h2 className="mt-2 text-3xl font-black">🔢 Combinaisons</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
  <div className="rounded-2xl border border-[#9B6A28]/40 bg-[#1A130E] p-4">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C44934]/15 text-xl">
        🎲
      </div>

      <div>
        <p className="text-sm font-black uppercase tracking-wider text-[#C44934]">
          Brelan, Full, Carré et Yam
        </p>

        <p className="mt-1 text-sm font-bold leading-relaxed text-slate-300">
          Seule la combinaison compte : la valeur des dés n’a pas
          d’importance.
        </p>
      </div>
    </div>
  </div>

  <div className="rounded-2xl border border-[#9B6A28]/40 bg-[#1A130E] p-4">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C44934]/15 text-xl">
        🔢
      </div>

      <div>
        <p className="text-sm font-black uppercase tracking-wider text-[#C44934]">
          Quinte
        </p>

        <p className="mt-1 text-sm font-bold text-slate-300">
          Deux suites sont possibles :
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-lg border border-[#9B6A28]/40 bg-black/30 px-3 py-1.5 font-black text-white">
            1 · 2 · 3 · 4 · 5
          </span>

          <span className="rounded-lg border border-[#9B6A28]/40 bg-black/30 px-3 py-1.5 font-black text-white">
            2 · 3 · 4 · 5 · 6
          </span>
        </div>
      </div>
    </div>
  </div>
</div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FigureCard title="Brelan" score="20 points" />
            <FigureCard title="Full" score="30 points" />
            <FigureCard title="Carré" score="40 points" />
            <FigureCard title="Quinte" score="50 points" />
            <FigureCard title="Yam" score="60 points" />
            <FigureCard title="+ / −" score="5 à 30 points" />
          </div>
        </section>
      </div>
    </main>
  );
}

function RuleCard({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <article className="rounded-3xl border border-[#9B6A28]/50 bg-[#111111] p-6">
      <h2 className="text-2xl font-black">{title}</h2>

      <p className="mt-3 font-bold leading-relaxed text-slate-400">
        {content}
      </p>
    </article>
  );
}

function FigureCard({
  title,
  score,
}: {
  title: string;
  score: string;
}) {
  return (
    <div className="rounded-2xl border border-[#9B6A28]/40 bg-[#F4E9DC] p-4 text-[#241812]">
      <div className="text-lg font-black">{title}</div>
      <div className="mt-1 text-sm font-bold text-[#6B4D3A]">{score}</div>
    </div>
  );
}