import type { ReactNode } from "react";
import CoralSidebar from "./CoralSidebar";
import ExamHeader from "./ExamHeader";

type ExamLayoutProps = {
    children: ReactNode;
    onLogout: () => void;
};

export default function ExamLayout({ children, onLogout }: ExamLayoutProps) {
    return (
        <div className="shell shell--exam">
            <ExamHeader onLogout={onLogout} />
            <CoralSidebar />
            <main className="shell-main shell-main--gray">{children}</main>
        </div>
    );
}
