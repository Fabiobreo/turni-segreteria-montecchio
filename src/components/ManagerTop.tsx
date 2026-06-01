import Link from "next/link";
import { logoutAction } from "@/app/manager/actions";
import { ACTIVE_SEASON } from "@/lib/office";

type Tab = "settimana" | "mese" | "riepilogo" | "segretarie";

export function ManagerTop({ active, right }: { active?: Tab; right?: React.ReactNode }) {
  const link = (tab: Tab, href: string, label: string) => (
    <Link className={`btn sm${active === tab ? " primary" : ""}`} href={href}>
      {label}
    </Link>
  );
  return (
    <div className="topbar">
      <div className="brand-dot" />
      <strong>Gestione Turni</strong>
      <span className="pill">Manager</span>
      <nav className="row" style={{ marginLeft: 18, gap: 6 }}>
        {link("settimana", "/manager", "Settimana")}
        {link("mese", "/manager/mese", "Mese")}
        {link("riepilogo", "/manager/riepilogo", "Riepilogo ore")}
        {link("segretarie", "/manager/segretarie", "Segretarie")}
      </nav>
      <div className="sp" />
      {right}
      <span className="tag neutral" style={{ textTransform: "capitalize" }}>
        {ACTIVE_SEASON}
      </span>
      <form action={logoutAction}>
        <button className="btn sm ghost" type="submit">
          Esci
        </button>
      </form>
    </div>
  );
}
