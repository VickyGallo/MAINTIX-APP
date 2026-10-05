export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-muted uppercase">Facility Management</p>
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">Maintix</h1>
      <p className="text-lg text-muted">
        La plataforma está en construcción. Ver el plan en <code>specs/README.md</code>.
      </p>
    </main>
  );
}
