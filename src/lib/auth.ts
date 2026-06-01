// Autenticazione manager: password unica -> cookie di sessione.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "manager_session";

function expectedToken(): string {
  // Token derivato dalla password: semplice ma sufficiente per 1 utente.
  const pw = process.env.MANAGER_PASSWORD ?? "turni2026";
  return Buffer.from(`manager:${pw}`).toString("base64url");
}

export async function isManager(): Promise<boolean> {
  const store = await cookies();
  return store.get(COOKIE)?.value === expectedToken();
}

export async function requireManager(): Promise<void> {
  if (!(await isManager())) redirect("/manager/login");
}

export async function login(password: string): Promise<boolean> {
  const pw = process.env.MANAGER_PASSWORD ?? "turni2026";
  if (password !== pw) return false;
  const store = await cookies();
  store.set(COOKIE, expectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return true;
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
