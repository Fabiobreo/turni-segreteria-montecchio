import Link from "next/link";

export default function Home() {
  return (
    <div className="wrap" style={{ maxWidth: 560 }}>
      <div className="card pad stack" style={{ marginTop: 40 }}>
        <div className="row" style={{ alignItems: "center" }}>
          <div className="brand-dot" />
          <h1 style={{ margin: 0 }}>Gestione Turni — Segreteria</h1>
        </div>
        <p className="muted">
          Le segretarie accedono dal proprio link personale. La manager entra nell&apos;area
          completa con la password.
        </p>
        <Link className="btn primary" href="/manager">
          Area manager →
        </Link>
      </div>
    </div>
  );
}
