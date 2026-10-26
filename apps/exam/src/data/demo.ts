export const DEMO_SESSION_KEY = "proctoring.exam.demoSession";
export const DEMO_SESSION_VALUE = "demo";

export const demoCredentials = {
    username: "usuario",
    password: "123",
} as const;

export type Course = {
    id: string;
    title: string;
    category: string;
};

export const courses: Course[] = [
    {
        id: "antiguo-testamento-1006-c1",
        title: "Antiguo Testamento 1006-C1",
        category: "ICRF",
    },
    {
        id: "historia-iglesia-1001-c1",
        title: "Historia de la Iglesia I 1001-C1",
        category: "ICRF",
    },
];

export function getCourse(id: string): Course | undefined {
    return courses.find((course) => course.id === id);
}

export const evaluation = {
    id: "evaluacion-1",
    title: "EVALUACIÓN 1: Pentateuco y los Libros Históricos",
    status: "Pendiente de hacer",
    welcome:
        "Bienvenido/a a la Evaluación 1 de la asignatura. Esta actividad de demostración permite recorrer la preparación y respuesta de un cuestionario.",
    generalNotes: [
        "El cuestionario contiene 3 preguntas de selección múltiple.",
        "Selecciona una alternativa por pregunta.",
        "Antes de comenzar, completa la simulación de cámara, micrófono, pantalla y aceptación.",
    ],
    recommendations: [
        "Lee atentamente cada enunciado.",
        "Al terminar, utiliza “Finalizar cuestionario”.",
    ],
    captureNote: "Esta demostración no captura imagen, audio ni pantalla.",
} as const;

export type QuestionOption = {
    id: string;
    label: string;
};

export type Question = {
    id: string;
    prompt: string;
    options: QuestionOption[];
};

export const questions: Question[] = [
    {
        id: "pregunta-1",
        prompt: "¿Cuál de los siguientes libros forma parte del Pentateuco?",
        options: [
            { id: "a", label: "Salmos" },
            { id: "b", label: "Génesis" },
            { id: "c", label: "Isaías" },
            { id: "d", label: "Proverbios" },
        ],
    },
    {
        id: "pregunta-2",
        prompt: "¿Qué acontecimiento ocupa un lugar central en el libro del Éxodo?",
        options: [
            { id: "a", label: "La construcción del templo de Jerusalén" },
            { id: "b", label: "El reinado de Salomón" },
            { id: "c", label: "La salida del pueblo de Israel de Egipto" },
            { id: "d", label: "La reconstrucción de las murallas de Jerusalén" },
        ],
    },
    {
        id: "pregunta-3",
        prompt: "¿Qué personaje sucede a Moisés como guía del pueblo de Israel?",
        options: [
            { id: "a", label: "David" },
            { id: "b", label: "Samuel" },
            { id: "c", label: "Salomón" },
            { id: "d", label: "Josué" },
        ],
    },
];

export type Answers = Record<string, string | null>;

export function emptyAnswers(): Answers {
    return Object.fromEntries(questions.map((question) => [question.id, null]));
}

export type PrepState = {
    camera: boolean;
    microphone: boolean;
    screen: boolean;
    accepted: boolean;
};

export const initialPrep: PrepState = {
    camera: false,
    microphone: false,
    screen: false,
    accepted: false,
};

export function canStartQuiz(prep: PrepState): boolean {
    return prep.camera && prep.microphone && prep.screen && prep.accepted;
}
