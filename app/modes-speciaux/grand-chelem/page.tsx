"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import AuthButton from "../../components/AuthButton";

const FEATURES = [
  {
    icon: "🎲",
    title: "Une partie = un set",
    description:
      "Chaque set est une véritable partie de Yam en 3 ou 6 colonnes.",
  },
  {
    icon: "🏆",
    title: "Premier à 3 victoires",
    description:
      "La finale se joue au meilleur des cinq sets, comme un Grand Chelem.",
  },
  {
    icon: "💾",
    title: "Reprise à tout moment",
    description:
      "Jouez la finale sur plusieurs jours et reprenez-la depuis le profil de l’un des participants.",
  },
  {
    icon: "📱",
    title: "Local ou Salon",
    description:
      "Choisissez indépendamment pour chaque set s’il est joué en local ou en Salon.",
  },
];

export default function GrandSlamPage() {
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
          className="rounded-xl border border-[#9B6A28]/60 bg-black px-4 py-2 font-black text-white transition hover:bg-[#241A13]"
        >
          Modes spéciaux
        </button>

        <section className="mt-8 overflow-hidden rounded-3xl border border-[#9B6A28]/60">
          <div className="relative min-h-[320px] overflow-hidden bg-[#B85632] px-6 py-12 sm:px-10">
            {/* Rectangle extérieur */}
  <div
    className="absolute border-2 border-white"
    style={{
      left: "5%",
      right: "5%",
      top: "5%",
      bottom: "5%",
    }}
  >
    {/* Ligne du haut (couloir) */}
    <div
      className="absolute left-0 right-0 border-t-2 border-white"
      style={{ top: "12%" }}
    />

    {/* Ligne du bas (couloir) */}
    <div
      className="absolute left-0 right-0 border-b-2 border-white"
      style={{ bottom: "12%" }}
    />
{/* Ligne de double haute */}
<div
  className="absolute bg-white"
  style={{
    left: 0,
    right: 0,
    top: "10%",
    height: "2px",
  }}
/>

{/* Ligne de double basse */}
<div
  className="absolute bg-white"
  style={{
    left: 0,
    right: 0,
    bottom: "10%",
    height: "2px",
  }}
/>
    {/* Filet */}
    <div
      className="absolute bg-white"
      style={{
        left: "50%",
        top: "-8px",
        bottom: "-8px",
        width: "2px",
        transform: "translateX(-50%)",
      }}
    />

    {/* Ligne de service gauche */}
    <div
      className="absolute bg-white"
      style={{
        left: "25%",
        top: "10%",
        bottom: "10%",
        width: "2px",
      }}
    />

    {/* Ligne de service droite */}
    <div
      className="absolute bg-white"
      style={{
        right: "25%",
        top: "10%",
        bottom: "10%",
        width: "2px",
      }}
    />

    {/* Ligne centrale de service */}
<div
  className="absolute bg-white"
  style={{
    left: "25%",
    right: "25%",
    top: "50%",
    height: "2px",
    transform: "translateY(-50%)",
  }}
/>
  </div>

            <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
              <div className="text-7xl">🎾</div>

              <p className="mt-5 text-sm font-black uppercase tracking-[0.3em] text-white/70">
                Mode spécial
              </p>

              <h1
                className="mt-3 text-4xl font-black sm:text-6xl"
                style={{
                  WebkitTextStroke: "1px black",
                }}
              >
                Finale de Grand Chelem
              </h1>

               <p className="mt-5 max-w-2xl text-lg font-bold text-white/85">
                Affrontez un adversaire dans une finale composée de plusieurs
                parties de Yam. Le premier à remporter trois sets soulève le
                trophée.
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push("/modes-speciaux/grand-chelem/nouveau")
                }
                className="mt-8 rounded-xl bg-[#F4E9DC] px-7 py-4 text-lg font-black text-black transition hover:scale-[1.02] hover:bg-white"
              >
                Créer une finale
              </button>
            </div>
          </div>

          <div className="bg-[#F4E9DC] p-6 text-black sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-[#D8B996] bg-white/50 p-5"
                >
                  <div className="text-3xl">{feature.icon}</div>

                  <h2 className="mt-3 text-lg font-black">{feature.title}</h2>

                  <p className="mt-2 font-bold text-[#5B4636]">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-[#9B6A28]/40 bg-[#111111] p-6 sm:p-8">
          <h2 className="text-2xl font-black">Comment se déroule une finale ?</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Step
              number="1"
              title="Choisissez le tournoi"
              description="Wimbledon, Roland-Garros, US Open ou Open d’Australie."
            />

            <Step
              number="2"
              title="Définissez les joueurs"
              description="Les deux participants sont associés une seule fois et restent fixes."
            />

            <Step
              number="3"
              title="Jouez les sets"
              description="Choisissez Local ou Salon à chaque nouvelle partie de Yam."
            />
          </div>

          <div className="mt-8 rounded-2xl border border-[#9B6A28]/50 bg-black p-5 text-center">
            <p className="text-sm font-black uppercase tracking-widest text-[#C44934]">
              Format
            </p>

            <p className="mt-2 text-xl font-black">
              Premier joueur à 3 sets remportés
            </p>

            <div className="mt-4 flex items-center justify-center gap-2 text-2xl">
              <span>🟢</span>
              <span>🟢</span>
              <span>🟢</span>
              <span className="mx-2 text-slate-600">contre</span>
              <span>⚪</span>
              <span>⚪</span>
              <span>⚪</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/modes-speciaux/grand-chelem/nouveau")
            }
            className="mt-6 w-full rounded-xl bg-[#B85632] px-5 py-4 text-lg font-black text-white transition hover:bg-[#D75A43]"
          >
            Créer ma finale
          </button>
        </section>
      </div>
    </main>
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
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#B85632] text-lg font-black text-white">
        {number}
      </div>

      <h3 className="mt-4 text-lg font-black">{title}</h3>

      <p className="mt-2 font-bold text-slate-500">{description}</p>
    </article>
  );
}