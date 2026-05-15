'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AcademicCapIcon, UserIcon } from '@heroicons/react/24/outline';

export default function Navbar() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    // Don't show navbar on admin or student pages
    if (pathname?.startsWith('/admin') || pathname?.startsWith('/student')) return null;

    return (
        <nav className="bg-gradient-to-r from-purple-900 to-purple-800 border-b border-purple-700 sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 text-white hover:text-purple-200 transition-colors">
                        <AcademicCapIcon className="w-8 h-8" />
                        <span className="text-xl font-bold">Qualifica MA/PI</span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex items-center gap-6">
                        <Link
                            href="/"
                            className={`text-sm font-medium transition-colors ${isActive('/')
                                    ? 'text-white'
                                    : 'text-purple-200 hover:text-white'
                                }`}
                        >
                            Home
                        </Link>
                        <Link
                            href="/cursos"
                            className={`text-sm font-medium transition-colors ${isActive('/cursos')
                                    ? 'text-white'
                                    : 'text-purple-200 hover:text-white'
                                }`}
                        >
                            Cursos
                        </Link>

                        {/* Login Button */}
                        <Link
                            href="/login"
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all duration-200 border border-white/20"
                        >
                            <UserIcon className="w-4 h-4" />
                            Entrar
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
