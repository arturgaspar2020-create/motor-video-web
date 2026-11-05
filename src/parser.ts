export type Scene = {
  id: number;
  type: string;
  name: string;
  directives: string[];
  narration: string;
};

export function parseScript(source: string) {
  const lines = source.replace(/\r/g, "").split("\n");
  let language = "pt";
  let title = "Novo projeto";
  const scenes: Scene[] = [];
  const warnings: string[] = [];
  let current: Scene | null = null;
  const flush = () => {
    if (!current) return;
    current.narration = current.narration.trim();
    scenes.push(current);
    current = null;
  };

  const hasSceneHeaders = lines.some(line => /^\s*\[cena:\s*/i.test(line));
  if (!hasSceneHeaders) {
    const text = lines
      .map(line => line.trim())
      .filter(line => line && !/^@(idioma|titulo)\s+/i.test(line))
      .join("\n");
    const sentences = text.split(/(?<=[.!?…])\s+/).map(value => value.trim()).filter(Boolean);
    for (let index = 0; index < sentences.length; index += 2) {
      const id = scenes.length + 1;
      scenes.push({
        id,
        type: "narrativa",
        name: "Cena " + String(id).padStart(2, "0"),
        directives: [],
        narration: sentences.slice(index, index + 2).join(" ")
      });
    }
    for (const line of lines) {
      const value = line.trim();
      if (value.startsWith("@idioma ")) language = value.slice(8).trim();
      if (value.startsWith("@titulo ")) title = value.slice(8).trim();
    }
    return { language, title, scenes, warnings };
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith("@idioma ")) { language = line.slice(8).trim(); continue; }
    if (line.startsWith("@titulo ")) { title = line.slice(8).trim(); continue; }
    const match = line.match(/^\[cena:\s*([^\]|]+)(?:\|\s*([^\]]+))?\]$/i);
    if (match) {
      flush();
      current = { id: scenes.length + 1, type: match[1].trim(), name: (match[2] || match[1]).trim(), directives: [], narration: "" };
      continue;
    }
    if (/^\[[^\]]+\]$/.test(line)) {
      if (current) current.directives.push(line);
      else warnings.push("Linha " + (i + 1) + ": marcador fora de cena");
      continue;
    }
    if (!current) {
      warnings.push("Linha " + (i + 1) + ": texto antes da primeira cena");
      continue;
    }
    current.narration += (current.narration ? "\n" : "") + line;
  }
  flush();
  return { language, title, scenes, warnings };
}

export const countWords = (source: string) => (source.trim().match(/\S+/g) || []).length;
