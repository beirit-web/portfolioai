import bakery from "../assets/illustrations/bakery.svg?inline";
import dialogue from "../assets/illustrations/dialogue.svg?inline";
import practice from "../assets/illustrations/practice.svg?inline";
import quiz from "../assets/illustrations/quiz.svg?inline";

type IllustrationProps = { className?: string };
type LearningIllustrationProps = IllustrationProps & { kind: "dialogue" | "practice" | "quiz" };
const learningIllustrations = { dialogue, practice, quiz };

// Original decorative SVG artwork. Image documents keep the vector paths out
// of the page's layout tree; inline URLs avoid another network dependency.
export function BakeryIllustration({ className }: IllustrationProps) {
  return <img className={className} src={bakery} width="520" height="360" alt="" aria-hidden="true" decoding="async" />;
}

export function LearningIllustration({ kind, className }: LearningIllustrationProps) {
  return <img className={className} src={learningIllustrations[kind]} width="240" height="160" alt="" aria-hidden="true" decoding="async" loading="lazy" />;
}
