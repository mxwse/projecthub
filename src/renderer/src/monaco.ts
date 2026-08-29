import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    if (label === 'json') return new jsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
    if (label === 'typescript' || label === 'javascript') return new tsWorker()
    return new editorWorker()
  }
}

monaco.editor.defineTheme('projecthub-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#191914',
    'editor.foreground': '#f2f2ec',
    'editorLineNumber.foreground': '#f4f4ef70',
    'editorLineNumber.activeForeground': '#ff6a35',
    'editor.lineHighlightBackground': '#1e1e18',
    'editorCursor.foreground': '#ff6a35',
    'editor.selectionBackground': '#3a3a30',
    'editorIndentGuide.background1': '#f4f4ef14',
    'editorWidget.background': '#1e1e18',
    'editorWidget.border': '#f4f4ef2b',
    'scrollbarSlider.background': '#f4f4ef22',
    'scrollbarSlider.hoverBackground': '#f4f4ef33'
  }
})

monaco.editor.defineTheme('projecthub-light', {
  base: 'vs',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#fdfdfb',
    'editor.foreground': '#141410',
    'editorLineNumber.activeForeground': '#c23a08',
    'editorCursor.foreground': '#c23a08'
  }
})

const LANG_BY_EXT: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  jsonc: 'json',
  html: 'html',
  htm: 'html',
  vue: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  md: 'markdown',
  markdown: 'markdown',
  py: 'python',
  cs: 'csharp',
  java: 'java',
  kt: 'kotlin',
  rs: 'rust',
  go: 'go',
  cpp: 'cpp',
  cc: 'cpp',
  c: 'c',
  h: 'cpp',
  hpp: 'cpp',
  php: 'php',
  rb: 'ruby',
  swift: 'swift',
  dart: 'dart',
  sql: 'sql',
  sh: 'shell',
  bash: 'shell',
  ps1: 'powershell',
  psm1: 'powershell',
  bat: 'bat',
  cmd: 'bat',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'ini',
  ini: 'ini',
  cfg: 'ini',
  env: 'ini',
  xml: 'xml',
  svg: 'xml',
  csproj: 'xml',
  sln: 'plaintext',
  txt: 'plaintext',
  gitignore: 'plaintext',
  lock: 'plaintext',
  gradle: 'plaintext',
  dockerfile: 'dockerfile'
}

export function languageForFile(name: string): string {
  const lower = name.toLowerCase()
  if (lower === 'dockerfile') return 'dockerfile'
  const ext = lower.includes('.') ? lower.split('.').pop()! : lower
  return LANG_BY_EXT[ext] ?? 'plaintext'
}

export { monaco }
