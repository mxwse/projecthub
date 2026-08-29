import { test } from 'node:test'
import assert from 'node:assert/strict'
import { istInnerhalb } from './pfad-grenze.ts'

/**
 * Tests der Pfadgrenze fuer die files:*-Handler. Laeuft mit "node --test",
 * ohne Abhaengigkeit und ohne Electron.
 */

const wurzeln = ['D:\\Projekte\\mxw-it', 'D:\\Kunden\\Acme']

test('die Wurzel selbst ist erlaubt', () => {
  assert.equal(istInnerhalb('D:\\Projekte\\mxw-it', wurzeln, 'win32'), true)
})

test('eine Datei unterhalb der Wurzel ist erlaubt', () => {
  assert.equal(istInnerhalb('D:\\Projekte\\mxw-it\\src\\index.ts', wurzeln, 'win32'), true)
})

test('die zweite Wurzel gilt genauso', () => {
  assert.equal(istInnerhalb('D:\\Kunden\\Acme\\readme.md', wurzeln, 'win32'), true)
})

test('ein Pfad ausserhalb wird abgelehnt', () => {
  assert.equal(istInnerhalb('C:\\Windows\\System32\\config\\SAM', wurzeln, 'win32'), false)
  assert.equal(istInnerhalb('D:\\Privat\\steuer.pdf', wurzeln, 'win32'), false)
})

test('ein Praefix-Nachbar ist kein Treffer', () => {
  // Genau die Falle, gegen die der Trenner am Ende schuetzt.
  assert.equal(istInnerhalb('D:\\Projekte\\mxw-it-geheim\\notizen.md', wurzeln, 'win32'), false)
})

test('Verzeichniswechsel nach oben wird aufgeloest und abgelehnt', () => {
  assert.equal(
    istInnerhalb('D:\\Projekte\\mxw-it\\..\\..\\Privat\\steuer.pdf', wurzeln, 'win32'),
    false
  )
})

test('Verzeichniswechsel, der wieder hineinfuehrt, bleibt erlaubt', () => {
  assert.equal(
    istInnerhalb('D:\\Projekte\\mxw-it\\src\\..\\package.json', wurzeln, 'win32'),
    true
  )
})

test('Windows vergleicht ohne Ruecksicht auf Gross- und Kleinschreibung', () => {
  assert.equal(istInnerhalb('d:\\projekte\\MXW-IT\\src', wurzeln, 'win32'), true)
})

test('auf Linux zaehlt die Schreibweise', () => {
  const posix = ['/home/max/projekte']
  assert.equal(istInnerhalb('/home/max/projekte/app', posix, 'linux'), true)
  assert.equal(istInnerhalb('/home/max/Projekte/app', posix, 'linux'), false)
})

test('ohne Wurzeln ist nichts erlaubt', () => {
  assert.equal(istInnerhalb('D:\\Projekte\\mxw-it', [], 'win32'), false)
})

test('leere Eingaben sind nicht erlaubt', () => {
  assert.equal(istInnerhalb('', wurzeln, 'win32'), false)
})

test('leere Wurzeleintraege werden uebersprungen, nicht als Freibrief gewertet', () => {
  // Ein Projekt ohne localPath darf nicht das gesamte Dateisystem oeffnen.
  assert.equal(istInnerhalb('C:\\Windows', ['', '   '], 'win32'), false)
})

test('eine Wurzel mit Trenner am Ende verhaelt sich gleich', () => {
  assert.equal(istInnerhalb('D:\\Projekte\\mxw-it\\src', ['D:\\Projekte\\mxw-it\\'], 'win32'), true)
  assert.equal(istInnerhalb('D:\\Projekte\\andere', ['D:\\Projekte\\mxw-it\\'], 'win32'), false)
})
