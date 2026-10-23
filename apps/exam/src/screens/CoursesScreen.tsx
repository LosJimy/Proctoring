import CampusLayout from "../components/CampusLayout";
import CourseCard from "../components/CourseCard";
import { courses } from "../data/demo";

type CoursesScreenProps = {
    onOpenCourse: (courseId: string) => void;
    onLogout: () => void;
};

export default function CoursesScreen({ onOpenCourse, onLogout }: CoursesScreenProps) {
    return (
        <CampusLayout onLogout={onLogout}>
            <section className="courses-banner">
                <h1>Mis cursos</h1>
                <p>Páginas del sitio / Mis cursos</p>
            </section>

            <section className="panel">
                <h2>Vista general de curso</h2>
                <div className="toolbar">
                    <select disabled aria-label="Todos">
                        <option>Todos</option>
                    </select>
                    <input type="search" disabled placeholder="Buscar" aria-label="Buscar" />
                    <select disabled aria-label="Ordenar por nombre del curso">
                        <option>Ordenar por nombre del curso</option>
                    </select>
                    <select disabled aria-label="Tarjeta">
                        <option>Tarjeta</option>
                    </select>
                </div>
                <p className="help-text">
                    Filtro, búsqueda, orden y tipo de vista no disponibles en esta demostración
                </p>
                <div className="course-grid">
                    {courses.map((course) => (
                        <CourseCard key={course.id} course={course} onOpen={onOpenCourse} />
                    ))}
                </div>
            </section>
        </CampusLayout>
    );
}
