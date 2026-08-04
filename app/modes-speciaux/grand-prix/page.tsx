"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import AuthButton from "../../components/AuthButton";

const FEATURES = [
  {
    icon: "🏎️",
    title: "De 2 à 6 joueurs",
    description:
      "Tous les participants disputent chaque Grand Prix et restent en course jusqu’à la fin de la saison.",
  },
  {
    icon: "🏁",
    title: "De 3 à 7 Grands Prix",
    description:
      "Choisissez la longueur de la compétition selon le temps dont vous disposez.",
  },
  {
    icon: "🌍",
    title: "Circuits aléatoires",
    description:
      "Chaque saison possède son propre calendrier, tiré aléatoirement parmi des circuits emblématiques.",
  },
  {
    icon: "📱",
    title: "Local ou Salon",
    description:
      "Choisissez indépendamment pour chaque Grand Prix s’il est joué en local ou en Salon.",
  },
];

export default function GrandPrixPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-dvh overflow-hidden bg-black px-4 py-8 text-white">
      <AuthButton />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.04]">
        <Image
          src="/favicon.png"
          alt=""
          width={1000}
          height={1000}
          priority
          className="select-none rotate-[-12deg]"
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <button
          type="button"
          onClick={() => router.push("/modes-speciaux")}
          className="rounded-xl border border-[#D3202F]/70 bg-black px-4 py-2 font-black text-white transition hover:bg-[#321116]"
        >
          Modes spéciaux
        </button>

        <section className="mt-8 overflow-hidden rounded-3xl border border-[#D3202F]/70">
          <div className="relative min-h-[340px] overflow-hidden bg-gradient-to-br from-[#171717] via-[#8E111B] to-[#D3202F] px-6 py-12 sm:px-10">
            <RacingTrackBackground />

            <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
              <div className="text-7xl">🏎️</div>

              <p className="mt-5 text-sm font-black uppercase tracking-[0.3em] text-white/70">
                Mode spécial
              </p>

              <h1
                className="mt-3 text-4xl font-black sm:text-6xl"
                style={{
                  WebkitTextStroke: "1px black",
                }}
              >
                Grand Prix
              </h1>

              <p className="mt-5 max-w-2xl text-lg font-bold text-white/85">
                Disputez une saison composée de plusieurs Grands Prix,
                accumulez des points et devenez Champion YamScore.
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push("/modes-speciaux/grand-prix/nouveau")
                }
                className="mt-8 rounded-xl bg-white px-7 py-4 text-lg font-black text-black transition hover:scale-[1.02] hover:bg-slate-100"
              >
                Créer une saison
              </button>
            </div>
          </div>

          <div className="bg-[#F2F2F2] p-6 text-black sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-[#D6D6D6] bg-white/80 p-5"
                >
                  <div className="text-3xl">{feature.icon}</div>

                  <h2 className="mt-3 text-lg font-black">
                    {feature.title}
                  </h2>

                  <p className="mt-2 font-bold text-[#555555]">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-[#D3202F]/40 bg-[#111111] p-6 sm:p-8">
          <h2 className="text-2xl font-black">
            Comment se déroule une saison ?
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Step
              number="1"
              title="Créez le championnat"
              description="Choisissez de 2 à 6 joueurs, le mode de feuille et une saison de 3 à 7 Grands Prix."
            />

            <Step
              number="2"
              title="Découvrez le calendrier"
              description="Les circuits sont tirés aléatoirement, sans doublon, et leur ordre reste fixe pour toute la saison."
            />

            <Step
              number="3"
              title="Cumulez les points"
              description="Chaque classement rapporte des points. Le joueur le plus régulier devient champion après le dernier Grand Prix."
            />
          </div>

          <div className="mt-8 rounded-2xl border border-[#D3202F]/50 bg-black p-5 text-center">
            <p className="text-sm font-black uppercase tracking-widest text-[#F13C49]">
              Format
            </p>

            <p className="mt-2 text-xl font-black">
              Une partie de Yam = un Grand Prix
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <RaceBadge label="Monaco" flag="🇲🇨" />
              <span className="text-slate-600">→</span>
              <RaceBadge label="Suzuka" flag="🇯🇵" />
              <span className="text-slate-600">→</span>
              <RaceBadge label="Monza" flag="🇮🇹" />
              <span className="text-slate-600">→</span>
              <RaceBadge label="Champion" flag="🏆" />
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/modes-speciaux/grand-prix/nouveau")
            }
            className="mt-6 w-full rounded-xl bg-[#D3202F] px-5 py-4 text-lg font-black text-white transition hover:bg-[#F13C49]"
          >
            Créer ma saison
          </button>
        </section>
      </div>
    </main>
  );
}

function RacingTrackBackground() {
  return (
    <>
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute rounded-[45%]"
          style={{
            left: "5%",
            right: "5%",
            top: "12%",
            bottom: "12%",
            border: "32px solid rgba(0,0,0,0.75)",
            transform: "rotate(-5deg)",
          }}
        />

        <div
          className="absolute rounded-[45%]"
          style={{
            left: "9%",
            right: "9%",
            top: "20%",
            bottom: "20%",
            border: "2px dashed rgba(255,255,255,0.9)",
            transform: "rotate(-5deg)",
          }}
        />
      </div>

      <div
        className="absolute inset-x-0 bottom-0 h-10 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(45deg, #fff 25%, transparent 25%), linear-gradient(-45deg, #fff 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #fff 75%), linear-gradient(-45deg, transparent 75%, #fff 75%)",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
          backgroundSize: "20px 20px",
        }}
      />
    </>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-black p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D3202F] text-lg font-black text-white">
        {number}
      </div>

      <h3 className="mt-4 text-lg font-black">{title}</h3>

      <p className="mt-2 font-bold text-slate-500">{description}</p>
    </article>
  );
}

function RaceBadge({
  label,
  flag,
}: {
  label: string;
  flag: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-[#171717] px-4 py-3">
      <div className="text-2xl">{flag}</div>
      <div className="mt-1 text-sm font-black text-white">{label}</div>
    </div>
  );
}