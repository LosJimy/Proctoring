import CampusLayout from "../components/CampusLayout";
import { evaluation, type Course } from "../data/demo";

type CourseScreenProps = {
    course: Course;
    onOpenEvaluation: () => void;
    onBackHome: () => void;
    onLogout: () => void;
};

export default function CourseScreen({
    course,
    onOpenEvaluation,
    onBackHome,
    onLogout,
}: CourseScreenProps) {
    return (
        <CampusLayout onLogout={onLogout}>
            <section className="panel panel--course">
                <p className="course-kicker">{course.category}</p>
                <h1 className="course-heading">{course.title}</h1>

                <div className="resource-row">Pauta de Evaluación — Foros</div>

                <div className="evaluation-row">
                    <button type="button" className="evaluation-title" onClick={onOpenEvaluation}>
                        {evaluation.title}
                    </button>
                    <p className="evaluation-status">{evaluation.status}</p>
                    <p>{evaluation.welcome}</p>
                    <h2>Indicaciones generales</h2>
                    {evaluation.generalNotes.map((note) => (
                        <p key={note}>{note}</p>
                    ))}
                    <h2>Recomendaciones</h2>
                    {evaluation.recommendations.map((note) => (
                        <p key={note}>{note}</p>
                    ))}
                    <p className="help-text">{evaluation.captureNote}</p>
                </div>

                <nav className="course-nav">
                    <button type="button" disabled>
                        Sección anterior — General
                    </button>
                    <button type="button" className="btn-secondary" onClick={onBackHome}>
                        Volver al Home
                    </button>
                    <button type="button" disabled>
                        Siguiente sección — Unidad II
                    </button>
                </nav>
            </section>
        </CampusLayout>
    );
}
