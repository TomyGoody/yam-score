"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import AuthButton from "../../components/AuthButton";

const FEATURES = [
  {
    icon: "👥",
    title: "1v1, 2v2 ou 3v3",
    description:
      "Jouez à 2, 4 ou 6 joueurs. En équipe, les scores des coéquipiers sont additionnés.",
  },
  {
    icon: "🏀",
    title: "4 quart-temps",
    description:
      "Chaque match est découpé en quatre périodes. Chaque quart-temps remporté rapporte 1 point.",
  },
  {
    icon: "🏆",
    title: "1, 3 ou 5 matchs",
    description:
      "Choisissez la durée de la compétition. Une victoire de match rapporte 4 points.",
  },
  {
    icon: "📱",
    title: "Local ou Salon",
    description:
      "Choisissez indépendamment pour chaque match s’il est joué en local ou en Salon.",
  },
];

export default function BasketPage() {
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
          className="rounded-xl border bg-black px-4 py-2 font-black text-white transition hover:brightness-125"
          style={{
            borderColor: "rgba(232,117,36,0.7)",
          }}
        >
          Modes spéciaux
        </button>

        <section
          className="mt-8 overflow-hidden rounded-3xl border"
          style={{
            borderColor: "rgba(232,117,36,0.7)",
          }}
        >
          <div
            className="relative min-h-[340px] overflow-hidden px-6 py-12 sm:px-10"
            style={{
              background:
                "linear-gradient(135deg, #1A0D05 0%, #8C3D0D 50%, #E87524 100%)",
            }}
          >
            <BasketCourtBackground />

            <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
              <div className="text-7xl">🏀</div>

              <p className="mt-5 text-sm font-black uppercase tracking-[0.3em] text-white/70">
                Mode spécial
              </p>

              <h1
                className="mt-3 text-4xl font-black sm:text-6xl"
                style={{
                  WebkitTextStroke: "1px black",
                }}
              >
                Basket
              </h1>

              <p className="mt-5 max-w-2xl text-lg font-bold text-white/85">
                Formez deux équipes, remportez les quart-temps et accumulez
                assez de points pour gagner la compétition.
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push("/modes-speciaux/basket/nouveau")
                }
                className="mt-8 rounded-xl bg-white px-7 py-4 text-lg font-black text-black transition hover:scale-[1.02] hover:bg-slate-100"
              >
                Créer une compétition
              </button>
            </div>
          </div>

          <div
            className="p-6 text-black sm:p-8"
            style={{
              backgroundColor: "#F4E9DC",
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  className="rounded-2xl border p-5"
                  style={{
                    borderColor: "#E2C4A7",
                    backgroundColor: "rgba(255,255,255,0.7)",
                  }}
                >
                  <div className="text-3xl">{feature.icon}</div>

                  <h2 className="mt-3 text-lg font-black">
                    {feature.title}
                  </h2>

                  <p
                    className="mt-2 font-bold"
                    style={{
                      color: "#65452F",
                    }}
                  >
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          className="mt-6 rounded-3xl border p-6 sm:p-8"
          style={{
            borderColor: "rgba(232,117,36,0.4)",
            backgroundColor: "#111111",
          }}
        >
          <h2 className="text-2xl font-black">
            Comment se déroule une compétition ?
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Step
              number="1"
              title="Formez les équipes"
              description="Jouez en 1v1, 2v2 ou 3v3 et composez les deux équipes manuellement ou aléatoirement."
            />

            <Step
              number="2"
              title="Jouez les quart-temps"
              description="Chaque partie est divisée en quatre périodes. L’équipe qui marque le plus de points Yam pendant un quart-temps gagne 1 point."
            />

            <Step
              number="3"
              title="Remportez la compétition"
              description="Chaque victoire de match rapporte 4 points supplémentaires. L’équipe qui cumule le plus de points après le dernier match devient championne."
            />
          </div>

          <div
            className="mt-8 rounded-2xl border bg-black p-5 text-center"
            style={{
              borderColor: "rgba(232,117,36,0.5)",
            }}
          >
            <p
              className="text-sm font-black uppercase tracking-widest"
              style={{
                color: "#F59A55",
              }}
            >
              Format
            </p>

            <p className="mt-2 text-xl font-black">
              Une partie de Yam = un match
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <QuarterBadge label="Q1" points="+1" />
              <span className="text-slate-600">→</span>

              <QuarterBadge label="Q2" points="+1" />
              <span className="text-slate-600">→</span>

              <QuarterBadge label="Q3" points="+1" />
              <span className="text-slate-600">→</span>

              <QuarterBadge label="Q4" points="+1" />
              <span className="text-slate-600">→</span>

              <QuarterBadge
                label="Victoire"
                points="+4"
                highlight
              />
            </div>

            <p className="mx-auto mt-5 max-w-2xl text-sm font-bold text-slate-500">
              En cas d’égalité sur un quart-temps, chaque équipe reçoit 0,5
              point. Une égalité à la fin du match se joue en prolongation.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <RuleCard
              title="3 colonnes"
              description="39 coups par joueur"
              quarters="10 · 10 · 10 · 9"
            />

            <RuleCard
              title="6 colonnes"
              description="78 coups par joueur"
              quarters="20 · 19 · 20 · 19"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/modes-speciaux/basket/nouveau")
            }
            className="mt-6 w-full rounded-xl px-5 py-4 text-lg font-black text-white transition hover:brightness-110"
            style={{
              backgroundColor: "#E87524",
            }}
          >
            Créer ma compétition
          </button>
        </section>
      </div>
    </main>
  );
}

function BasketCourtBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-20">
      <div
        className="absolute"
        style={{
          left: "5%",
          right: "5%",
          top: "9%",
          bottom: "9%",
          border: "3px solid rgba(255,255,255,0.75)",
        }}
      >
        {/* Ligne médiane */}
        <div
          className="absolute"
          style={{
            left: "50%",
            top: 0,
            bottom: 0,
            width: "3px",
            backgroundColor: "rgba(255,255,255,0.75)",
            transform: "translateX(-50%)",
          }}
        />

        {/* Cercle central */}
        <div
          className="absolute rounded-full"
          style={{
            left: "50%",
            top: "50%",
            width: "120px",
            height: "120px",
            border: "3px solid rgba(255,255,255,0.75)",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Raquette gauche */}
        <div
          className="absolute"
          style={{
            left: 0,
            top: "29%",
            bottom: "29%",
            width: "18%",
            borderTop: "3px solid rgba(255,255,255,0.75)",
            borderRight: "3px solid rgba(255,255,255,0.75)",
            borderBottom: "3px solid rgba(255,255,255,0.75)",
          }}
        />

        {/* Raquette droite */}
        <div
          className="absolute"
          style={{
            right: 0,
            top: "29%",
            bottom: "29%",
            width: "18%",
            borderTop: "3px solid rgba(255,255,255,0.75)",
            borderLeft: "3px solid rgba(255,255,255,0.75)",
            borderBottom: "3px solid rgba(255,255,255,0.75)",
          }}
        />

        {/* Cercle gauche */}
        <div
          className="absolute rounded-full"
          style={{
            left: "18%",
            top: "50%",
            width: "90px",
            height: "90px",
            border: "3px solid rgba(255,255,255,0.75)",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Cercle droit */}
        <div
          className="absolute rounded-full"
          style={{
            right: "18%",
            top: "50%",
            width: "90px",
            height: "90px",
            border: "3px solid rgba(255,255,255,0.75)",
            transform: "translate(50%, -50%)",
          }}
        />
      </div>
    </div>
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
    <article
      className="rounded-2xl border bg-black p-5"
      style={{
        borderColor: "#1E293B",
      }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-black text-white"
        style={{
          backgroundColor: "#E87524",
        }}
      >
        {number}
      </div>

      <h3 className="mt-4 text-lg font-black">
        {title}
      </h3>

      <p className="mt-2 font-bold text-slate-500">
        {description}
      </p>
    </article>
  );
}

function QuarterBadge({
  label,
  points,
  highlight = false,
}: {
  label: string;
  points: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-xl border px-4 py-3 text-white"
      style={{
        borderColor: highlight ? "#E87524" : "#334155",
        backgroundColor: highlight ? "#E87524" : "#171717",
      }}
    >
      <div className="text-sm font-black">
        {label}
      </div>

      <div
        className="mt-1 text-xs font-black"
        style={{
          color: highlight
            ? "rgba(255,255,255,0.8)"
            : "#F59A55",
        }}
      >
        {points}
      </div>
    </div>
  );
}

function RuleCard({
  title,
  description,
  quarters,
}: {
  title: string;
  description: string;
  quarters: string;
}) {
  return (
    <article
      className="rounded-2xl border bg-black p-5"
      style={{
        borderColor: "#1E293B",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-black">
            {title}
          </h3>

          <p className="mt-1 text-sm font-bold text-slate-500">
            {description}
          </p>
        </div>

        <span className="text-2xl">
          🏀
        </span>
      </div>

      <div
        className="mt-4 rounded-xl px-4 py-3 text-center"
        style={{
          backgroundColor: "#171717",
        }}
      >
        <div className="text-xs font-black uppercase tracking-widest text-slate-500">
          Q1 · Q2 · Q3 · Q4
        </div>

        <div
          className="mt-1 font-black"
          style={{
            color: "#F59A55",
          }}
        >
          {quarters}
        </div>
      </div>
    </article>
  );
}