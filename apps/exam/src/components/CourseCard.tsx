import type { Course } from "../data/demo";

type CourseCardProps = {
    course: Course;
    onOpen: (courseId: string) => void;
};

export default function CourseCard({ course, onOpen }: CourseCardProps) {
    return (
        <article className="course-card">
            <div className="course-cover">Portada institucional pendiente</div>
            <div className="course-card__body">
                <p className="course-card__category">{course.category}</p>
                <h3 className="course-card__title">{course.title}</h3>
            </div>
            <button type="button" className="btn-primary course-card__action" onClick={() => onOpen(course.id)}>
                Entrar en la Asignatura
            </button>
        </article>
    );
}
