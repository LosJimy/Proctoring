import { type FormEvent, useState } from "react";
import { demoCredentials } from "../data/demo";
import LogoPlaceholder from "../components/LogoPlaceholder";

type LoginScreenProps = {
    onSuccess: () => void;
};

export default function LoginScreen({ onSuccess }: LoginScreenProps) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (username === demoCredentials.username && password === demoCredentials.password) {
            setError(null);
            setUsername("");
            setPassword("");
            onSuccess();
            return;
        }
        setError("Nombre de usuario o contraseña incorrectos.");
    }

    return (
        <div className="login-layout">
            <section className="login-panel">
                <form className="login-form" onSubmit={handleSubmit} noValidate>
                    <LogoPlaceholder />
                    <h1>Acceder</h1>

                    <button type="button" className="btn-institutional" disabled>
                        Continuar como Acceso Docentes
                    </button>
                    <button type="button" className="btn-institutional" disabled>
                        Continuar como Acceso Estudiantes
                    </button>
                    <p className="help-text">
                        Acceso institucional no disponible en esta demostración
                    </p>

                    <div className="login-separator" role="separator">
                        <span>o</span>
                    </div>

                    <label htmlFor="demo-username">Nombre de usuario</label>
                    <input
                        id="demo-username"
                        name="username"
                        type="text"
                        autoComplete="username"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                    />

                    <label htmlFor="demo-password">Contraseña</label>
                    <input
                        id="demo-password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />

                    <p className="muted-link">¿Olvidó su nombre de usuario o contraseña?</p>
                    <p className="help-text">
                        La recuperación de contraseña no está disponible en esta demostración.
                    </p>

                    <div className="login-error" aria-live="polite" role="status">
                        {error}
                    </div>

                    <button type="submit" className="btn-primary">
                        Acceder
                    </button>

                    <p className="help-text">
                        Acceso de demostración, no autenticación productiva. Usuario: usuario.
                        Contraseña: 123.
                    </p>

                    <p className="login-footer">Copyright 2025 UCN — Todos los derechos reservados</p>
                </form>
            </section>
            <div className="login-aside" aria-hidden="true" />
        </div>
    );
}
