import ExamLayout from "../components/ExamLayout";
import QuestionCard from "../components/QuestionCard";
import { questions, type Answers, type Course } from "../data/demo";

type QuizScreenProps = {
    course: Course;
    questionIndex: number;
    answers: Answers;
    onSelect: (questionId: string, optionId: string) => void;
    onPrevious: () => void;
    onNext: () => void;
    onFinish: () => void;
    onLogout: () => void;
};

export default function QuizScreen({
    course,
    questionIndex,
    answers,
    onSelect,
    onPrevious,
    onNext,
    onFinish,
    onLogout,
}: QuizScreenProps) {
    const question = questions[questionIndex];
    if (!question) {
        return null;
    }

    const total = questions.length;
    const number = questionIndex + 1;
    const selected = answers[question.id] ?? null;
    const isFirst = questionIndex === 0;
    const isLast = questionIndex === total - 1;

    return (
        <ExamLayout onLogout={onLogout}>
            <section className="panel panel--exam">
                <p className="course-kicker">{course.title}</p>
                <p className="supervision-note">Supervisión de examen — Simulación</p>
                <div className="quiz-layout">
                    <aside className="quiz-status">
                        <p className="quiz-status__tag">Pregunta {number}</p>
                        <p>
                            Pregunta {number} de {total}
                        </p>
                        <p>{selected ? "Respuesta seleccionada" : "Sin responder aún"}</p>
                    </aside>
                    <div className="quiz-main">
                        <QuestionCard
                            question={question}
                            questionNumber={number}
                            selectedOptionId={selected}
                            onSelect={(optionId) => onSelect(question.id, optionId)}
                        />
                        <div className="quiz-actions">
                            {!isFirst ? (
                                <button type="button" className="btn-primary" onClick={onPrevious}>
                                    Página anterior
                                </button>
                            ) : null}
                            {isLast ? (
                                <button type="button" className="btn-primary" onClick={onFinish}>
                                    Finalizar cuestionario
                                </button>
                            ) : (
                                <button type="button" className="btn-primary" onClick={onNext}>
                                    Siguiente página
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </ExamLayout>
    );
}
