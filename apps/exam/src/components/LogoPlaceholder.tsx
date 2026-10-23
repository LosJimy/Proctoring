type LogoPlaceholderProps = {
    variant?: "light" | "dark";
};

export default function LogoPlaceholder({ variant = "light" }: LogoPlaceholderProps) {
    return (
        <div className={`logo-placeholder logo-placeholder--${variant}`}>
            Logo institucional pendiente
        </div>
    );
}
