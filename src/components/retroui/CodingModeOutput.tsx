import React from "react";
import CodeBubble from "./CodeBubble";

interface CodingModeOutputProps {
  problemTitle: string;
  clarifyingQuestions: { question: string; answer: string }[];
  edgeCases: { case: string; explanation?: string }[];
  optimalSolution: string;
  bruteForceSolution: string;
  language?: string;
}

const CodingModeOutput: React.FC<CodingModeOutputProps> = ({
  problemTitle,
  clarifyingQuestions,
  edgeCases,
  optimalSolution,
  bruteForceSolution,
  language = "python",
}) => (
  <div className="space-y-4">
    <div className="text-lg font-bold text-primary/90 mb-1">{problemTitle}</div>
    <div className="mb-2">
      <span className="font-semibold text-primary/80">Clarifying Questions:</span>
      <ul className="list-disc ml-6 mt-1 text-sm">
        {clarifyingQuestions && clarifyingQuestions.length > 0 ? (
          clarifyingQuestions.map((q, i) => (
            <li key={i}>
              <span className="font-medium">{q.question}</span>
              {q.answer && (
                <span className="text-zinc-300"> — {q.answer}</span>
              )}
            </li>
          ))
        ) : (
          <li className="text-zinc-400">No clarifying questions provided.</li>
        )}
      </ul>
    </div>
    <div className="mb-2">
      <span className="font-semibold text-primary/80">Edge Cases to Consider:</span>
      <ul className="list-disc ml-6 mt-1 text-sm">
        {edgeCases.map((ec, i) => (
          <li key={i}>
            {ec.case}
            {ec.explanation && (
              <span className="text-zinc-400"> — {ec.explanation}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
    <div>
      <CodeBubble
        code={optimalSolution}
        label="Optimal Solution"
        language={language}
      />
    </div>
    <div>
      <CodeBubble
        code={bruteForceSolution}
        label="Brute-force Solution"
        language={language}
      />
    </div>
  </div>
);

export default CodingModeOutput;
