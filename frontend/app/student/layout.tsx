'use client';

import StudentSidebar from '@/components/student/Sidebar';
import StudentHeader from '@/components/student/Header';

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="admin-layout">
            <StudentSidebar />
            <div className="admin-main">
                <StudentHeader />
                <main className="admin-content">
                    {children}
                </main>
            </div>
        </div>
    );
}
