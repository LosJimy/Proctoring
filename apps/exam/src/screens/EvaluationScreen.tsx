import { type Ref } from "react";
import ExamLayout from "../components/ExamLayout";
import PreparationModal from "../components/PreparationModal";
import { evaluation, type Course, type PrepState } from "../data/demo";

type EvaluationScreenProps = {
    course: Course;
    prep: PrepState;
    modalOpen: boolean;
    attemptButtonRef: Ref<HTMLButtonElement>;
    onOpenModal: () => void;
    onPrepChange: (next: PrepState) => void;
    onCancelModal: () => void;
    onStartQuiz: () => void;
    onLogout: () => void;
    onBackHome: () => void;
};

export default function EvaluationScreen({
    course,
    prep,
    modalOpen,
    attemptButtonRef,
    onOpenModal,
    onPrepChange,
    onCancelModal,
    onStartQuiz,
    onLogout,
    onBackHome,
}: EvaluationScreenProps) {
    return (
        <ExamLayout onLogout={onLogout}>
            <section className="panel panel--exam">
                <p>
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={onBackHome}
                    >
                        Volver al Home
                    </button>
                </p>
                <p className="course-kicker">{course.title}</p>
                <h1 className="exam-title">{evaluation.title}</h1>
                <div className="exam-notes">
                    {evaluation.generalNotes.map((note) => (
                        <p key={note}>{note}</p>
                    ))}
                    <p>{evaluation.captureNote}</p>
                </div>
                <button
                    ref={attemptButtonRef}
                    type="button"
                    className="btn-primary"
                    onClick={onOpenModal}
                >
                    Intento de cuestionario
                </button>
            </section>
            <PreparationModal
                open={modalOpen}
                evaluationTitle={evaluation.title}
                prep={prep}
                onPrepChange={onPrepChange}
                onCancel={onCancelModal}
                onStart={onStartQuiz}
                onBackHome={onBackHome}
            />
        </ExamLayout>
    );
}
