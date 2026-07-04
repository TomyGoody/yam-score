
import Image from "next/image";

export default function LoadingScreen() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-zinc-950">
      <Image
        src="/favicon.png"
        alt="YamScore"
        width={80}
        height={80}
        className="animate-spin"
      />

      <h2 className="mt-6 text-2xl font-bold text-yellow-400">
        YamScore
      </h2>

      <p className="mt-2 text-zinc-400">
        Chargement...
      </p>
    </main>
  );
}