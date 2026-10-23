import type { Question } from "../data/demo";

type QuestionCardProps = {
    question: Question;
    questionNumber: number;
    selectedOptionId: string | null;
    onSelect: (optionId: string) => void;
};

export default function QuestionCard({
    question,
    questionNumber,
    selectedOptionId,
    onSelect,
}: QuestionCardProps) {
    return (
        <fieldset className="question-card">
            <legend className="question-card__legend">
                Pregunta {questionNumber}. {question.prompt}
            </legend>
            <div className="question-options">
                {question.options.map((option) => {
                    const optionId = `${question.id}-${option.id}`;
                    return (
                        <label key={option.id} className="question-option" htmlFor={optionId}>
                            <input
                                id={optionId}
                                type="radio"
                                name={question.id}
                                value={option.id}
                                checked={selectedOptionId === option.id}
                                onChange={() => onSelect(option.id)}
                            />
                            <span>
                                {option.id}. {option.label}
                            </span>
                        </label>
                    );
                })}
            </div>
        </fieldset>
    );
}
