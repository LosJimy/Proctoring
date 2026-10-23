import type { ReactNode } from "react";
import CampusHeader from "./CampusHeader";
import CoralSidebar from "./CoralSidebar";

type CampusLayoutProps = {
    children: ReactNode;
    onLogout: () => void;
};

export default function CampusLayout({ children, onLogout }: CampusLayoutProps) {
    return (
        <div className="shell shell--campus">
            <CampusHeader onLogout={onLogout} />
            <CoralSidebar />
            <main className="shell-main">{children}</main>
        </div>
    );
}
