/**
 * The design direction, in words a builder can act on.
 *
 * A person spends real time on the Style step and the Mood dials, and
 * until now none of it reached what they take away: the repair prompt
 * carried the findings and nothing about how the app should look or
 * feel. Two whole steps were decoration. This turns those choices into
 * instructions, so the taste chosen here is the taste asked for.
 */
import type { Mood } from "../store";
import type { Persona, StyleCard } from "../data/seed";

/** The three dials, read as three words. */
export function moodWords(energy: number, style: number, tone: number): string {
  const a = energy >= 60 ? "Energetic" : "Calm";
  const b = style >= 60 ? "bold" : "minimal";
  const c = tone <= 35 ? "playful" : "serious";
  return `${a}, ${b}, ${c}`;
}

/**
 * The direction as prompt lines: the style with the values it actually
 * carries, the mood as words and as the things they imply, and the
 * audience when someone has been named. Returns an empty array when
 * there is nothing true to say, so the prompt never pads itself.
 */
export function directionLines(
  style: StyleCard | undefined,
  mood: Mood,
  audience: Persona | null,
): string[] {
  if (!style) return [];
  const lines: string[] = [];
  lines.push("Design direction, chosen by the app's owner:");
  lines.push(
    `- Style: ${style.name} by ${style.by}, a ${style.category.toLowerCase()} direction on a ${
      style.dark ? "dark" : "light"
    } ground.`,
  );
  lines.push(
    `- Its values: text ${style.ink}, accent ${style.accent}, corner radius ${style.radius}px. Use these rather than inventing a palette.`,
  );
  lines.push(`- Mood: ${moodWords(mood.energy, mood.style, mood.tone)}.`);

  /* the dials say something specific about motion and density; saying
     it plainly beats hoping an adjective carries it */
  const motion =
    mood.energy >= 60
      ? "Motion may be quick and visible, up to 220ms, and may overshoot slightly."
      : "Motion stays under 200ms and never bounces; things settle rather than arrive.";
  const density =
    mood.style >= 60
      ? "Type may be large and contrast high; one bold move per screen is the ceiling."
      : "Type stays modest, weight does the work, and whitespace is the loudest element.";
  const voice =
    mood.tone <= 35
      ? "Copy may be warm and use contractions; never cute at the cost of clarity."
      : "Copy is plain and unhurried; no exclamation marks, no urgency, no filler.";
  lines.push(`- ${motion}`);
  lines.push(`- ${density}`);
  lines.push(`- ${voice}`);

  if (audience) {
    lines.push(
      `- Built for ${audience.name}, ${audience.age}, ${audience.role.toLowerCase()}: ${audience.line}. Judge every screen against this person.`,
    );
  }
  return lines;
}
