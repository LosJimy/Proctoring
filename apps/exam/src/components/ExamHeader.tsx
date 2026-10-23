import LogoPlaceholder from "./LogoPlaceholder";

type ExamHeaderProps = {
    onLogout: () => void;
};

export default function ExamHeader({ onLogout }: ExamHeaderProps) {
    return (
        <header className="exam-header">
            <LogoPlaceholder variant="dark" />
            <button type="button" className="link-button link-button--on-dark" onClick={onLogout}>
                Cerrar sesión
            </button>
        </header>
    );
}
