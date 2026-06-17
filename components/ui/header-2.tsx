'use client';
import React from 'react';
import { motion, useMotionValueEvent, useScroll as useFramerScroll } from 'motion/react';
import { Button } from '@/components/ui/button';
import { NeonButton } from '@/components/ui/neon-button';
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
							backgroundColor: 'rgba(9, 9, 11, 0.8)',
							backdropFilter: 'blur(20px)',
							WebkitBackdropFilter: 'blur(20px)',
							boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
							borderWidth: '1px',
							borderStyle: 'solid',
							borderColor: 'rgba(255,255,255,0.08)',
						}
					: {
							width: '100%',
							marginTop: 0,
							borderRadius: 0,
							backgroundColor: 'rgba(9, 9, 11, 0.7)',
							backdropFilter: 'blur(20px)',
							WebkitBackdropFilter: 'blur(20px)',
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
				<a href="/" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex items-center justify-center cursor-pointer">
					<motion.img
						src="/logo_design.png"
						alt="KubeCanvas"
						className="w-auto h-10 md:h-26 block align-middle"
					/>
				</a>
				<div className="hidden items-center gap-3 md:flex">
					<NeonButton variant="default" size="sm" onClick={scrollToFeatures} className="!bg-white/5 !border-white/20 hover:!bg-white/10" neonColor="rgba(255,255,255,0.8)">
						Features
					</NeonButton>
					<div
						className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
						style={{
							color: '#22c55e',
							backgroundColor: 'rgba(34, 197, 94, 0.1)',
							border: '1px solid rgba(34, 197, 94, 0.3)',
							boxShadow: '0 0 12px rgba(34, 197, 94, 0.2), inset 0 0 8px rgba(34, 197, 94, 0.05)',
							fontFamily: 'var(--font-geist-mono)',
							letterSpacing: '0.05em',
						}}
					>
						<span className="inline-block size-1.5 rounded-full bg-green-500 animate-pulse" />
						v0.1
					</div>
				</div>
				<Button size="icon" variant="outline" onClick={() => setOpen(!open)} className="md:hidden">
					<MenuToggleIcon open={open} className="size-5" duration={300} />
				</Button>
			</nav>

			<div
				className={`bg-background/90 fixed top-14 right-0 bottom-0 left-0 z-50 flex flex-col overflow-hidden border-y md:hidden ${
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
					</div>
				</div>
			</div>
		</motion.header>
	);
}
