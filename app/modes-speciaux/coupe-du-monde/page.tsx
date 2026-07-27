"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import AuthButton from "../../components/AuthButton";

const FEATURES = [
  {
    icon: "🏆",
    title: "Élimination directe",
    description:
      "Chaque confrontation correspond à une partie de Yam. Le gagnant se qualifie pour le tour suivant.",
  },
  {
    icon: "🎲",
    title: "Tableau aléatoire",
    description:
      "Les participants sont placés aléatoirement dans le tableau au lancement de la compétition.",
  },
  {
    icon: "⏭️",
    title: "Qualifications automatiques",
    description:
      "Lorsque le nombre de joueurs n’est pas une puissance de deux, certains participants accèdent directement au tour suivant.",
  },
  {
    icon: "📱",
    title: "Local ou Salon",
    description:
      "Chaque match peut être joué en local ou en Salon, indépendamment des autres rencontres.",
  },
];

export default function WorldCupPage() {
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
          className="rounded-xl border border-[#0B6B3A]/70 bg-black px-4 py-2 font-black text-white transition hover:bg-[#123C28]"
        >
          Modes spéciaux
        </button>

        <section className="mt-8 overflow-hidden rounded-3xl border border-[#0B6B3A]/70">
          {/* Hero terrain de football */}
          <div
            className="relative min-h-[320px] overflow-hidden px-6 py-12 sm:px-10"
            style={{ backgroundColor: "#0B6B3A" }}
          >
            {/* Terrain extérieur */}
            <div
              className="absolute"
              style={{
                left: "5%",
                right: "5%",
                top: "7%",
                bottom: "7%",
                border: "2px solid rgba(255,255,255,0.65)",
              }}
            >
              {/* Ligne médiane */}
              <div
                className="absolute"
                style={{
                  left: "50%",
                  top: 0,
                  bottom: 0,
                  width: "2px",
                  backgroundColor: "rgba(255,255,255,0.65)",
                  transform: "translateX(-50%)",
                }}
              />

              {/* Rond central */}
              <div
                className="absolute rounded-full"
                style={{
                  left: "50%",
                  top: "50%",
                  width: "110px",
                  height: "110px",
                  border: "2px solid rgba(255,255,255,0.65)",
                  transform: "translate(-50%, -50%)",
                }}
              />

              {/* Point central */}
              <div
                className="absolute rounded-full"
                style={{
                  left: "50%",
                  top: "50%",
                  width: "7px",
                  height: "7px",
                  backgroundColor: "rgba(255,255,255,0.75)",
                  transform: "translate(-50%, -50%)",
                }}
              />

              {/* Surface de réparation gauche */}
              <div
                className="absolute"
                style={{
                  left: 0,
                  top: "24%",
                  bottom: "24%",
                  width: "18%",
                  borderTop: "2px solid rgba(255,255,255,0.65)",
                  borderRight: "2px solid rgba(255,255,255,0.65)",
                  borderBottom: "2px solid rgba(255,255,255,0.65)",
                }}
              />

              {/* Surface de but gauche */}
              <div
                className="absolute"
                style={{
                  left: 0,
                  top: "37%",
                  bottom: "37%",
                  width: "7%",
                  borderTop: "2px solid rgba(255,255,255,0.65)",
                  borderRight: "2px solid rgba(255,255,255,0.65)",
                  borderBottom: "2px solid rgba(255,255,255,0.65)",
                }}
              />

              {/* Surface de réparation droite */}
              <div
                className="absolute"
                style={{
                  right: 0,
                  top: "24%",
                  bottom: "24%",
                  width: "18%",
                  borderTop: "2px solid rgba(255,255,255,0.65)",
                  borderLeft: "2px solid rgba(255,255,255,0.65)",
                  borderBottom: "2px solid rgba(255,255,255,0.65)",
                }}
              />

              {/* Surface de but droite */}
              <div
                className="absolute"
                style={{
                  right: 0,
                  top: "37%",
                  bottom: "37%",
                  width: "7%",
                  borderTop: "2px solid rgba(255,255,255,0.65)",
                  borderLeft: "2px solid rgba(255,255,255,0.65)",
                  borderBottom: "2px solid rgba(255,255,255,0.65)",
                }}
              />

              {/* Corner haut gauche */}
              <div
                className="absolute"
                style={{
                  left: 0,
                  top: 0,
                  width: "18px",
                  height: "18px",
                  borderRight: "2px solid rgba(255,255,255,0.65)",
                  borderBottom: "2px solid rgba(255,255,255,0.65)",
                  borderBottomRightRadius: "18px",
                }}
              />

              {/* Corner bas gauche */}
              <div
                className="absolute"
                style={{
                  left: 0,
                  bottom: 0,
                  width: "18px",
                  height: "18px",
                  borderRight: "2px solid rgba(255,255,255,0.65)",
                  borderTop: "2px solid rgba(255,255,255,0.65)",
                  borderTopRightRadius: "18px",
                }}
              />

              {/* Corner haut droit */}
              <div
                className="absolute"
                style={{
                  right: 0,
                  top: 0,
                  width: "18px",
                  height: "18px",
                  borderLeft: "2px solid rgba(255,255,255,0.65)",
                  borderBottom: "2px solid rgba(255,255,255,0.65)",
                  borderBottomLeftRadius: "18px",
                }}
              />

              {/* Corner bas droit */}
              <div
                className="absolute"
                style={{
                  right: 0,
                  bottom: 0,
                  width: "18px",
                  height: "18px",
                  borderLeft: "2px solid rgba(255,255,255,0.65)",
                  borderTop: "2px solid rgba(255,255,255,0.65)",
                  borderTopLeftRadius: "18px",
                }}
              />
            </div>

            <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
              <div className="text-7xl">⚽</div>

              <p className="mt-5 text-sm font-black uppercase tracking-[0.3em] text-white/75">
                Mode spécial
              </p>

              <h1
                className="mt-3 text-4xl font-black sm:text-6xl"
                style={{
                  WebkitTextStroke: "1px black",
                }}
              >
                Coupe du Monde
              </h1>

              <p className="mt-5 max-w-2xl text-lg font-bold text-white/85">
                Créez un tournoi de 4 à 16 joueurs avec un tableau généré
                aléatoirement. Chaque victoire permet d’accéder au tour suivant
                jusqu’à la grande finale.
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push("/modes-speciaux/coupe-du-monde/nouveau")
                }
                className="mt-8 rounded-xl bg-[#F4E9DC] px-7 py-4 text-lg font-black text-black transition hover:scale-[1.02] hover:bg-white"
              >
                Créer une Coupe du Monde
              </button>
            </div>
          </div>

          {/* Fonctionnalités */}
          <div className="bg-[#F4E9DC] p-6 text-black sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-[#A9C8B5] bg-white/50 p-5"
                >
                  <div className="text-3xl">{feature.icon}</div>

                  <h2 className="mt-3 text-lg font-black">
                    {feature.title}
                  </h2>

                  <p className="mt-2 font-bold text-[#40594A]">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Déroulement */}
        <section className="mt-6 rounded-3xl border border-[#0B6B3A]/50 bg-[#111111] p-6 sm:p-8">
          <h2 className="text-2xl font-black">
            Comment se déroule une Coupe du Monde ?
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Step
              number="1"
              title="Ajoutez les participants"
              description="Choisissez entre 4 et 16 joueurs et associez éventuellement leurs profils."
            />

            <Step
              number="2"
              title="Générez le tableau"
              description="Les joueurs sont placés aléatoirement et les qualifications directes sont calculées automatiquement."
            />

            <Step
              number="3"
              title="Jouez les confrontations"
              description="Chaque match est une partie de Yam. Le vainqueur accède au tour suivant."
            />
          </div>

          {/* Format */}
          <div
  className="mt-8 rounded-2xl p-5 text-center"
  style={{
    border: "1px solid rgba(11,107,58,0.65)",
    backgroundColor: "#07110B",
  }}
>
  <p
    className="text-sm font-black uppercase tracking-widest"
    style={{ color: "#22A866" }}
  >
    Format
  </p>

  <p className="mt-2 text-xl font-black">
    Une partie gagnée = qualification
  </p>

  <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm font-black">
    <span
      className="rounded-full px-4 py-2 text-white"
      style={{ backgroundColor: "#123C28" }}
    >
      Huitièmes
    </span>

    <span className="text-slate-500">→</span>

    <span
      className="rounded-full px-4 py-2 text-white"
      style={{ backgroundColor: "#123C28" }}
    >
      Quarts
    </span>

    <span className="text-slate-500">→</span>

    <span
      className="rounded-full px-4 py-2 text-white"
      style={{ backgroundColor: "#123C28" }}
    >
      Demi-finales
    </span>

    <span className="text-slate-500">→</span>

    <span
      className="rounded-full px-4 py-2 text-white"
      style={{ backgroundColor: "#22A866" }}
    >
      Finale
    </span>
  </div>

  <p className="mx-auto mt-5 max-w-2xl text-sm font-bold text-slate-500">
    Le premier tour dépend du nombre de participants. Certains joueurs
    peuvent être directement qualifiés pour le tour suivant.
  </p>
</div>

          <button
            type="button"
            onClick={() =>
              router.push("/modes-speciaux/coupe-du-monde/nouveau")
            }
            className="mt-6 w-full rounded-xl px-5 py-4 text-lg font-black text-white transition hover:brightness-110"
style={{ backgroundColor: "#0B6B3A" }}
          >
            Créer ma Coupe du Monde
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
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-black text-white"
        style={{ backgroundColor: "#0B6B3A" }}
      >
        {number}
      </div>

      <h3 className="mt-4 text-lg font-black">{title}</h3>

      <p className="mt-2 font-bold text-slate-500">
        {description}
      </p>
    </article>
  );
}