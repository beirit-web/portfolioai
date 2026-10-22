import { memo, useEffect, useState } from "react";
import { Timer } from "lucide-react";

type CountdownProps = {
  startedAt: number;
  limit: number;
  pausedAt: number | null;
  label: string;
  secondsLabel: string;
  onExpire: () => void;
};

// Only this small subtree updates each second. Calculate from the deadline,
// rather than counting ticks, so background tabs cannot extend the time limit.
export default memo(function QuizCountdown({ startedAt, limit, pausedAt, label, secondsLabel, onExpire }: CountdownProps) {
  const deadline = startedAt + limit * 1000;
  const remaining = () => Math.max(0, Math.min(limit, Math.ceil((deadline - (pausedAt ?? Date.now())) / 1000)));
  const [seconds, setSeconds] = useState(remaining);

  useEffect(() => {
    const tick = () => {
      const value = remaining();
      setSeconds(value);
      if (value === 0 && pausedAt === null) onExpire();
    };
    tick();
    if (pausedAt !== null) return;
    const timer = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [deadline, limit, pausedAt, onExpire]);

  return <div className="quiz-timer-strip" role="timer" aria-label={label} aria-live="off">
    <div className="flex items-center justify-between gap-3 text-sm font-bold">
      <span className="inline-flex items-center gap-2"><Timer aria-hidden="true" className="h-4 w-4" />{label}</span>
      <span className={`quiz-countdown__value ${seconds <= 10 ? "text-red-600 dark:text-red-300" : "text-cyan-700 dark:text-cyan-300"}`}>
        {seconds} {secondsLabel}
      </span>
    </div>
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-hidden="true">
      <div className={`h-full rounded-full ${seconds <= 10 ? "bg-red-500" : "bg-cyan-500"}`} style={{ width: `${seconds / limit * 100}%` }} />
    </div>
  </div>;
});
