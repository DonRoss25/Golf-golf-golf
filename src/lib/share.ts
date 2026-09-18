export interface RoundShareSummary {
  courseName: string;
  playedAt: Date;
  players: Array<{ name: string; total: number; toPar: number }>;
  shareUrl: string;
}

export function buildRoundShareText(summary: RoundShareSummary): string {
  const date = summary.playedAt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const lines = summary.players
    .sort((a, b) => a.total - b.total)
    .map((p) => `${p.name}: ${p.total} (${p.toPar > 0 ? "+" : ""}${p.toPar})`);

  return [
    `⛳ ${summary.courseName} — ${date}`,
    ...lines,
    `Full scorecard: ${summary.shareUrl}`,
  ].join("\n");
}

/** sms: URI that pre-fills the Messages app body on iOS/Android. */
export function buildSmsShareLink(body: string, phone = ""): string {
  const encoded = encodeURIComponent(body);
  // iOS wants `&body=`, Android historically wants `?body=`; using `&`
  // after a bare number works on both current iOS and Android.
  return `sms:${phone}${phone ? "&" : "?"}body=${encoded}`;
}
