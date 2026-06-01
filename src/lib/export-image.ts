// Helper condiviso per esportare un nodo DOM come PNG e condividerlo (Web Share API).
import { toPng } from "html-to-image";

export async function nodeToPngBlob(node: HTMLElement): Promise<Blob> {
  const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true });
  const res = await fetch(dataUrl);
  return await res.blob();
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** Ritorna true se ha condiviso, false se non supportato (e va usato il download). */
export async function shareBlob(blob: Blob, fileName: string, title: string): Promise<boolean> {
  const file = new File([blob], fileName, { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data?: ShareData) => Promise<void>;
  };
  if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
    await nav.share({ files: [file], title, text: title });
    return true;
  }
  return false;
}

export function slugFileName(label: string): string {
  return `turni-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}.png`;
}
