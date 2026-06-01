"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSecretary } from "@/app/manager/actions";

type Sec = {
  id: string;
  name: string;
  color: string;
  contractType: string;
  weeklyMax: number;
  token: string;
};

export function SecretaryRow({ sec, baseUrl }: { sec: Sec; baseUrl: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState({
    name: sec.name,
    contractType: sec.contractType,
    weeklyMax: sec.weeklyMax,
  });

  const link = `${baseUrl}/d/${sec.token}`;

  function save() {
    setSaved(false);
    startTransition(async () => {
      await updateSecretary({
        id: sec.id,
        name: f.name,
        contractType: f.contractType as "fisso" | "a_chiamata",
        weeklyMax: Number(f.weeklyMax),
      });
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="card pad">
      <div className="row" style={{ alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span className={`chip ${sec.color}`} style={{ display: "inline" }}>{sec.name}</span>
        <label className="small muted">Nome
          <input className="input" style={{ display: "block", width: 150 }} value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })} />
        </label>
        <label className="small muted">Contratto
          <select className="input" style={{ display: "block" }} value={f.contractType}
            onChange={(e) => setF({ ...f, contractType: e.target.value })}>
            <option value="fisso">Fisso</option>
            <option value="a_chiamata">A chiamata</option>
          </select>
        </label>
        <label className="small muted">Tetto ore/settimana
          <input className="input" type="number" min={0} style={{ display: "block", width: 90 }} value={f.weeklyMax}
            onChange={(e) => setF({ ...f, weeklyMax: Number(e.target.value) })} />
        </label>
        <span className="sp" style={{ flex: 1 }} />
        <button className="btn sm primary" onClick={save} disabled={pending}>
          {pending ? "Salvo…" : saved ? "✓ Salvato" : "Salva"}
        </button>
      </div>
      <div className="row small muted" style={{ marginTop: 10, alignItems: "center", gap: 8 }}>
        <span>🔗 Link personale:</span>
        <code style={{ background: "#f3f4f6", padding: "2px 8px", borderRadius: 6 }}>{link}</code>
        <CopyButton text={link} />
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn sm ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
    >
      {done ? "✓ Copiato" : "Copia"}
    </button>
  );
}
