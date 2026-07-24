'use client';
import React from 'react';
import { motion, useMotionValueEvent, useScroll as useFramerScroll } from 'motion/react';
import { Button } from '@/components/ui/button';
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon';

interface HeaderProps {
	onLogin?: () => void;
}

export function Header({ onLogin }: HeaderProps) {
	const [open, setOpen] = React.useState(false);
	const [scrolled, setScrolled] = React.useState(false);
	const { scrollY } = useFramerScroll();

	useMotionValueEvent(scrollY, 'change', (latest) => {
		setScrolled(latest > 10);
	});

	React.useEffect(() => {
		if (open) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	}, [open]);

	const scrollToFeatures = () => {
		const el = document.getElementById('features');
		if (el) {
			el.scrollIntoView({ behavior: 'smooth' });
		}
	};

	return (
		<motion.header
			className="fixed left-1/2 top-0 z-50 border-border/0"
			style={{ x: '-50%' }}
			animate={{
				...(scrolled && !open
					? {
							width: 'min(1024px, calc(100% - 32px))',
							marginTop: 16,
							borderRadius: 9999,
						backgroundColor: 'rgba(9, 9, 11, 0.6)',
						backdropFilter: 'blur(40px)',
						WebkitBackdropFilter: 'blur(40px)',
							boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
							borderWidth: '1px',
							borderStyle: 'solid',
							borderColor: 'rgba(255,255,255,0.08)',
						}
					: {
							width: '100%',
							marginTop: 0,
							borderRadius: 0,
						backgroundColor: 'rgba(9, 9, 11, 0.5)',
						backdropFilter: 'blur(40px)',
						WebkitBackdropFilter: 'blur(40px)',
							boxShadow: '0 0px 0px rgba(0,0,0,0)',
							borderWidth: '0px',
							borderStyle: 'solid',
							borderColor: 'rgba(255,255,255,0)',
						}),
			}}
			transition={{
				type: 'spring',
				stiffness: 200,
				damping: 25,
				mass: 0.8,
			}}
		>
			<nav className="flex h-16 w-full items-center justify-between px-6 md:h-14 md:px-8">
				<a href="/" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center justify-center cursor-pointer self-center">
					<motion.img
						src="/logo_design.png"
						alt="KubeCanvas"
						className="w-auto h-12 md:h-20 block align-middle"
					/>
				</a>
				<div className="hidden items-center gap-3 md:flex">
					<Button variant="ghost" onClick={scrollToFeatures} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 cursor-pointer">
						Features
					</Button>
					<span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-sm font-[var(--font-geist-mono)] tracking-[0.05em]">
						v1.0
					</span>
				</div>
				<Button size="icon" variant="outline" onClick={() => setOpen(!open)} className="md:hidden">
					<MenuToggleIcon open={open} className="size-5" duration={300} />
				</Button>
			</nav>

			<div
				className={`bg-background/90 fixed top-16 right-0 bottom-0 left-0 z-50 flex flex-col overflow-hidden border-y md:hidden ${
					open ? 'block' : 'hidden'
				}`}
			>
				<div
					data-slot={open ? 'open' : 'closed'}
					className={`${
						open ? 'animate-in zoom-in-95' : 'animate-out zoom-out-95'
					} ease-out flex h-full w-full flex-col justify-end gap-y-2 p-4`}
				>
				<div className="flex flex-col gap-2">
					<button
						onClick={() => { setOpen(false); scrollToFeatures(); }}
						className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
					>
						Features
					</button>
					<button
						onClick={() => { setOpen(false); onLogin?.(); }}
						className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
					>
						Sign in
					</button>
				</div>
				</div>
			</div>
		</motion.header>
	);
}
