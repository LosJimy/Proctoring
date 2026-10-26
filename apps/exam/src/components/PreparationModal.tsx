import { useEffect, useId, useRef } from "react";
import { canStartQuiz, type PrepState } from "../data/demo";
import DeviceSwitch from "./DeviceSwitch";

type PreparationModalProps = {
    open: boolean;
    evaluationTitle: string;
    prep: PrepState;
    onPrepChange: (next: PrepState) => void;
    onCancel: () => void;
    onStart: () => void;
    onBackHome: () => void;
};

export default function PreparationModal({
    open,
    evaluationTitle,
    prep,
    onPrepChange,
    onCancel,
    onStart,
    onBackHome,
}: PreparationModalProps) {
    const titleId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    const firstFocusRef = useRef<HTMLInputElement>(null);
    const homeRef = useRef<HTMLButtonElement>(null);
    const startRef = useRef<HTMLButtonElement>(null);
    const ready = canStartQuiz(prep);

    useEffect(() => {
        if (!open) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        firstFocusRef.current?.focus();

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                event.preventDefault();
                onCancel();
                return;
            }

            if (event.key !== "Tab") {
                return;
            }

            const first = firstFocusRef.current;
            const last = ready ? startRef.current : homeRef.current;
            if (!first || !last) {
                return;
            }

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, onCancel, ready]);

    if (!open) {
        return null;
    }

    return (
        <div className="modal-backdrop">
            <div
                ref={dialogRef}
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                <header className="modal__header">
                    <h2 id={titleId}>Preparación de la evaluación</h2>
                    <p>{evaluationTitle}</p>
                </header>

                <div className="modal__body">
                    <section className="modal__consent">
                        <h3>Consentimiento biométrico — Demostración</h3>
                        <p>
                            Este paso representa el consentimiento y la preparación previos al
                            cuestionario.
                        </p>
                        <p>
                            Esta demostración simula la preparación de cámara, micrófono y pantalla.
                            No se solicitarán permisos ni se capturarán datos.
                        </p>
                        <p>
                            El texto definitivo del consentimiento biométrico está pendiente de
                            revisión legal.
                        </p>
                        <label className="consent-check" htmlFor="demo-consent">
                            <input
                                ref={firstFocusRef}
                                id="demo-consent"
                                type="checkbox"
                                checked={prep.accepted}
                                onChange={(event) =>
                                    onPrepChange({ ...prep, accepted: event.target.checked })
                                }
                            />
                            <span>Acepto continuar con la simulación del flujo de consentimiento.</span>
                        </label>
                    </section>

                    <section className="modal__devices">
                        <h3>Preparación de dispositivos</h3>
                        <p>
                            Activa los interruptores para simular la preparación. No se accederá a tus
                            dispositivos.
                        </p>
                        <DeviceSwitch
                            id="demo-camera"
                            label="Cámara"
                            checked={prep.camera}
                            onChange={(camera) => onPrepChange({ ...prep, camera })}
                        />
                        <DeviceSwitch
                            id="demo-microphone"
                            label="Micrófono"
                            checked={prep.microphone}
                            onChange={(microphone) => onPrepChange({ ...prep, microphone })}
                        />
                        <DeviceSwitch
                            id="demo-screen"
                            label="Pantalla"
                            checked={prep.screen}
                            onChange={(screen) => onPrepChange({ ...prep, screen })}
                        />
                        <div className="device-preview" aria-hidden="true">
                            <div className="device-preview__silhouette" />
                            <p>Vista previa simulada</p>
                        </div>
                    </section>
                </div>

                <footer className="modal__footer">
                    <button ref={homeRef} type="button" className="btn-secondary" onClick={onCancel}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={onBackHome}
                    >
                        Volver al Home
                    </button>
                    <button
                        ref={startRef}
                        type="button"
                        className="btn-primary"
                        onClick={onStart}
                        disabled={!ready}
                    >
                        Iniciar cuestionario
                    </button>
                </footer>
            </div>
        </div>
    );
}
