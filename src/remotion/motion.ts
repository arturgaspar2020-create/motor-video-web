export type MotionKind = "walk" | "run" | "open" | "close" | "pickup" | "drop" | "sit" | "stand" | "turn" | "look" | "react" | "jump" | "point" | "wave" | "idle";

const rules: Array<[MotionKind, RegExp]> = [
  ["run", /\b(run|runs|running|ran|sprint|sprinted|corr(?:e|eu|endo|er)|fug(?:e|iu|indo|ir)|rennt|rennen|läuft|lief|sprintet)\b/i],
  ["walk", /\b(walk|walks|walking|walked|step|steps|caminh(?:a|ou|ando|ar)|and(?:a|ou|ando)|geht|ging|wandert|läuft langsam)\b/i],
  ["open", /\b(open|opens|opened|opening|abr(?:e|iu|indo|ir)|destranca|öffnet|öffnete|oeffnet|oeffnete)\b/i],
  ["close", /\b(close|closes|closed|closing|fech(?:a|ou|ando|ar)|schließt|schloss)\b/i],
  ["pickup", /\b(pick(?:s)? up|picked up|grab(?:s|bed)?|take(?:s)?|took|peg(?:a|ou|ando)|apanh(?:a|ou|ando)|nimmt|nahm|hebt auf)\b/i],
  ["drop", /\b(drop(?:s|ped)?|falls?|fell|falling|derrub(?:a|ou|ando)|cai(?:u|ndo)|deixa cair|fällt|fiel)\b/i],
  ["sit", /\b(sit(?:s|ting)?|sat|senta(?:-se|r)?|sentou|sentado|setzt sich|saß)\b/i],
  ["stand", /\b(stand(?:s|ing)?|stood|levanta(?:-se|r)?|levantou|aufstehen|steht auf)\b/i],
  ["jump", /\b(jump(?:s|ed|ing)?|salta(?:r|ou|ndo)?|pula(?:r|ou|ndo)?|springt|sprang)\b/i],
  ["turn", /\b(turn(?:s|ed|ing)?|vira(?:-se|r)?|virou|gira(?:r|ou)?|dreht sich|drehte sich)\b/i],
  ["look", /\b(look(?:s|ed|ing)?|watch(?:es|ed)?|observ(?:a|ou|ando)|olha(?:r|ou|ndo)?|encara|blickt|sieht)\b/i],
  ["react", /\b(hear(?:s|d|ing)?|heard|sound|noise|barulho|ru[ií]do|assust(?:a|ou|ado)|surpris(?:e|ed)|startl(?:e|ed)|reag(?:e|iu|indo)|erschrickt)\b/i],
  ["point", /\b(point(?:s|ed|ing)?|apont(?:a|ou|ando)|zeigt|deutet)\b/i],
  ["wave", /\b(wav(?:e|es|ed|ing)|acen(?:a|ou|ando)|winkt)\b/i],
];

export function inferMotion(text: string): MotionKind {
  for (const [kind, pattern] of rules) if (pattern.test(text)) return kind;
  return "idle";
}

export function motionProgress(seconds: number, duration: number): number {
  if (duration <= 0) return 0;
  const x = Math.max(0, Math.min(1, seconds / duration));
  return x * x * (3 - 2 * x);
}

export function actorTravel(kind: MotionKind, seconds: number, duration: number) {
  const speed = kind === "run" ? 2.7 : kind === "walk" ? 1.15 : 0;
  const travel = Math.min(speed * Math.max(0, seconds), Math.max(0, duration * speed));
  return { x: 0, z: -travel, rotationY: kind === "turn" ? motionProgress(seconds, duration) * Math.PI * 0.75 : 0 };
}
