import { useRef, useState } from "react";
import {
    emptyAnswers,
    getCourse,
    initialPrep,
    type Answers,
    type PrepState,
} from "./data/demo";
import { clearDemoSession, hasDemoSession, saveDemoSession } from "./session";
import CourseScreen from "./screens/CourseScreen";
import CoursesScreen from "./screens/CoursesScreen";
import EvaluationScreen from "./screens/EvaluationScreen";
import LoginScreen from "./screens/LoginScreen";
import QuizScreen from "./screens/QuizScreen";

type View = "login" | "courses" | "course" | "evaluation" | "quiz";

export default function App() {
    const [view, setView] = useState<View>(() => (hasDemoSession() ? "courses" : "login"));
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [prep, setPrep] = useState<PrepState>(initialPrep);
    const [modalOpen, setModalOpen] = useState(false);
    const [answers, setAnswers] = useState<Answers>(emptyAnswers);
    const [questionIndex, setQuestionIndex] = useState(0);
    const attemptButtonRef = useRef<HTMLButtonElement>(null);
    const selectedCourse = selectedCourseId ? getCourse(selectedCourseId) : undefined;

    function resetAttempt() {
        setPrep(initialPrep);
        setModalOpen(false);
        setAnswers(emptyAnswers());
        setQuestionIndex(0);
    }

    function handleLoginSuccess() {
        saveDemoSession();
        resetAttempt();
        setSelectedCourseId(null);
        setView("courses");
    }

    function handleLogout() {
        clearDemoSession();
        resetAttempt();
        setSelectedCourseId(null);
        setView("login");
    }

    function handleOpenCourse(courseId: string) {
        setSelectedCourseId(courseId);
        setView("course");
    }

    function handleCancelModal() {
        setPrep(initialPrep);
        setModalOpen(false);
        window.requestAnimationFrame(() => {
            attemptButtonRef.current?.focus();
        });
    }

    function handleStartQuiz() {
        setModalOpen(false);
        setAnswers(emptyAnswers());
        setQuestionIndex(0);
        setView("quiz");
    }

    function handleFinishQuiz() {
        resetAttempt();
        setView("evaluation");
    }

    if (view === "login") {
        return <LoginScreen onSuccess={handleLoginSuccess} />;
    }

    if (view === "courses" || !selectedCourse) {
        return <CoursesScreen onOpenCourse={handleOpenCourse} onLogout={handleLogout} />;
    }

    if (view === "course") {
        return (
            <CourseScreen
                course={selectedCourse}
                onOpenEvaluation={() => setView("evaluation")}
                onBackHome={() => setView("courses")}
                onLogout={handleLogout}
            />
        );
    }

    if (view === "evaluation") {
        return (
            <EvaluationScreen
                course={selectedCourse}
                prep={prep}
                modalOpen={modalOpen}
                attemptButtonRef={attemptButtonRef}
                onOpenModal={() => {
                    setPrep(initialPrep);
                    setModalOpen(true);
                }}
                onPrepChange={setPrep}
                onCancelModal={handleCancelModal}
                onStartQuiz={handleStartQuiz}
                onLogout={handleLogout}
            />
        );
    }

    return (
        <QuizScreen
            course={selectedCourse}
            questionIndex={questionIndex}
            answers={answers}
            onSelect={(questionId, optionId) =>
                setAnswers((current) => ({ ...current, [questionId]: optionId }))
            }
            onPrevious={() => setQuestionIndex((index) => Math.max(0, index - 1))}
            onNext={() => setQuestionIndex((index) => index + 1)}
            onFinish={handleFinishQuiz}
            onLogout={handleLogout}
        />
    );
}
