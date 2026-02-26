export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="border-t border-gray-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <p className="text-center text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">IoT Data Portal</span> - A place to view and manage IoT data
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
                    <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href="https://github.com/lukas99o/iotdataportal"
                        className="font-medium text-blue-600 transition-colors hover:text-blue-700"
                    >
                        GitHub
                    </a>
                    <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href="mailto:lukas99o@hotmail.com"
                        className="font-medium text-blue-600 transition-colors hover:text-blue-700"
                    >
                        Contact
                    </a>
                    <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href="http://www.lukas99o.com"
                        className="font-medium text-blue-600 transition-colors hover:text-blue-700"
                    >
                        Portfolio
                    </a>
                </div>

                <p className="mt-3 text-center text-xs text-gray-500">&copy; {currentYear} IoT Data Portal.</p>
            </div>
        </footer>
    );
}
