import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
	title: 'Next.js WebSocket Chat Server Example',
	description: 'An example of a WebSocket chat server using Next.js',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={inter.className}>
				<main className="bg-base-200 text-base-content min-h-screen flex flex-col">
					<header className="flex items-center justify-between px-4 py-4 bg-base-100 mb-8">
						<h1 className="text-md md:text-2xl font-bold">WebSocket Chat Server Example</h1>
					</header>
					{children}
					<footer className="flex items-center justify-center py-4 bg-base-300 text-xs mt-auto">
						<p>&copy; {new Date().getFullYear()} Designly</p>
					</footer>
				</main>
			</body>
		</html>
	);
}
