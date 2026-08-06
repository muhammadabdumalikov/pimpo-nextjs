"use client";
import { LuLightbulb, LuListChecks } from "react-icons/lu";
import { useTranslations } from "@/hooks/useTranslations";

interface AiRailProps {
  streaming: boolean;
  /** Sends the clicked task/question as a prompt (same path as the composer). */
  onPick: (question: string) => void;
}

const cardClass =
  "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]";

// Radius stays at the call site: tasks are chunkier (rounded-xl), question
// rows tighter (rounded-lg), like the reference.
const promptClass =
  "bg-gray-50 px-3.5 text-left text-xs font-medium leading-snug text-gray-700 transition hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/[0.04] dark:text-gray-300 dark:hover:bg-white/[0.07] dark:hover:text-white";

/**
 * The workspace's right column (xl and up): ready-made task and question
 * prompts. Everything here just feeds the same send() the composer uses.
 */
export default function AiRail({ streaming, onPick }: AiRailProps) {
  const { t } = useTranslations();

  const tasks = [t("ai.task1"), t("ai.task2"), t("ai.task3")];
  const questions = [
    t("ai.suggest1"),
    t("ai.suggest2"),
    t("ai.suggest3"),
    t("ai.suggest4"),
    t("ai.suggest5"),
  ];

  return (
    <aside className="custom-scrollbar hidden w-[340px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-gray-100 p-4 dark:border-gray-800 xl:flex">
      {/* Suggested tasks — bigger, multi-step asks. First one leads full-width. */}
      <section className={cardClass}>
        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90">
          <LuListChecks size={15} className="text-gray-400 dark:text-gray-500" />
          {t("ai.railTasks")}
        </h4>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {tasks.map((task, i) => (
            <button
              key={task}
              onClick={() => onPick(task)}
              disabled={streaming}
              className={`${promptClass} rounded-xl py-3 ${i === 0 ? "col-span-2" : ""}`}
            >
              {task}
            </button>
          ))}
        </div>
      </section>

      {/* Suggested questions — quick one-liners, also useful as follow-ups. */}
      <section className={cardClass}>
        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90">
          <LuLightbulb size={15} className="text-gray-400 dark:text-gray-500" />
          {t("ai.railQuestions")}
        </h4>
        <div className="mt-3 space-y-1.5">
          {questions.map((q) => (
            <button
              key={q}
              onClick={() => onPick(q)}
              disabled={streaming}
              className={`${promptClass} w-full rounded-lg py-2.5`}
            >
              {q}
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
