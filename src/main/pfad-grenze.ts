import path from 'path'

/**
 * Prueft, ob ein Pfad innerhalb einer der erlaubten Wurzeln liegt.
 *
 * Bewusst ein eigenes, reines Modul ohne Electron- und ohne Datenbank-Import:
 * so laesst sich die Regel testen, ohne die App zu starten. ipc.ts reicht die
 * Wurzeln (Projektordner plus die in der Sitzung gewaehlten Ordner) herein.
 *
 * Ohne diese Grenze nahmen files:listDir, readFile, writeFile und
 * openInVSCode jeden absoluten Pfad entgegen — die contextBridge-API war
 * damit ein Lese- und Schreibzugang zum gesamten Dateisystem.
 */
export function istInnerhalb(
  ziel: string,
  wurzeln: readonly string[],
  plattform: NodeJS.Platform = process.platform
): boolean {
  if (!ziel) return false

  let aufgeloest: string
  try {
    aufgeloest = path.resolve(ziel)
  } catch {
    return false
  }

  // Windows vergleicht Pfade ohne Ruecksicht auf Gross-/Kleinschreibung.
  const norm = (s: string): string => {
    const r = path.resolve(s)
    return plattform === 'win32' ? r.toLowerCase() : r
  }

  const z = norm(aufgeloest)

  return wurzeln.filter(Boolean).some((w) => {
    const r = norm(w)
    // Die Wurzel selbst ist erlaubt, alles darunter auch. Der Trenner am Ende
    // verhindert, dass "C:\Projekte-geheim" als Treffer fuer "C:\Projekte"
    // durchgeht.
    return z === r || z.startsWith(r.endsWith(path.sep) ? r : r + path.sep)
  })
}
