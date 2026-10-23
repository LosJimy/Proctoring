import LogoPlaceholder from "./LogoPlaceholder";

type CampusHeaderProps = {
    onLogout: () => void;
};

export default function CampusHeader({ onLogout }: CampusHeaderProps) {
    return (
        <header className="campus-header">
            <LogoPlaceholder />
            <div className="campus-header__tools">
                <div className="header-deco" aria-hidden="true">
                    <span className="deco-icon deco-icon--bookmark" />
                    <span className="deco-icon deco-icon--bell" />
                    <span className="deco-icon deco-icon--message" />
                    <span className="deco-icon deco-icon--search" />
                    <span className="deco-avatar" />
                </div>
                <button type="button" className="link-button" onClick={onLogout}>
                    Cerrar sesión
                </button>
            </div>
        </header>
    );
}
