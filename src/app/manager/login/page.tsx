import { redirect } from "next/navigation";
import { login, isManager } from "@/lib/auth";

async function loginAction(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  const ok = await login(password);
  if (ok) redirect("/manager");
  redirect("/manager/login?errore=1");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ errore?: string }>;
}) {
  if (await isManager()) redirect("/manager");
  const { errore } = await searchParams;

  return (
    <div className="wrap" style={{ maxWidth: 420 }}>
      <form className="card pad stack" style={{ marginTop: 60 }} action={loginAction}>
        <div className="row" style={{ alignItems: "center" }}>
          <div className="brand-dot" />
          <h2 style={{ margin: 0 }}>Area manager</h2>
        </div>
        <p className="muted small">Inserisci la password per gestire i turni.</p>
        {errore ? <div className="tag bad">Password errata</div> : null}
        <input className="input" type="password" name="password" placeholder="Password" autoFocus required />
        <button className="btn primary" type="submit">
          Entra
        </button>
      </form>
    </div>
  );
}
