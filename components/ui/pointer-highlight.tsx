"use client";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { useRef, useEffect, useState, useCallback } from "react";

type Direction = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const DIRECTION_ORIGINS: Record<Direction, { originX: number; originY: number }> = {
  "top-left": { originX: 0, originY: 0 },
  "top-right": { originX: 1, originY: 0 },
  "bottom-left": { originX: 0, originY: 1 },
  "bottom-right": { originX: 1, originY: 1 },
};

export function PointerHighlight({
  children,
  rectangleClassName,
  pointerClassName,
  containerClassName,
  autoPlay = false,
  interval = 3500,
  directions = ["top-left", "top-right", "bottom-left", "bottom-right"],
}: {
  children: React.ReactNode;
  rectangleClassName?: string;
  pointerClassName?: string;
  containerClassName?: string;
  autoPlay?: boolean;
  interval?: number;
  directions?: Direction[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [animKey, setAnimKey] = useState(0);
  const [direction, setDirection] = useState<Direction>(directions[0]);

  const cycleDirection = useCallback(() => {
    setDirection((prev) => {
      const idx = directions.indexOf(prev);
      return directions[(idx + 1) % directions.length];
    });
    setAnimKey((k) => k + 1);
  }, [directions]);

  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!autoPlay) return;
    const id = setInterval(cycleDirection, interval);
    return () => clearInterval(id);
  }, [autoPlay, interval, cycleDirection]);

  const origin = DIRECTION_ORIGINS[direction];

  return (
    <div
      className={cn("relative w-fit", containerClassName)}
      ref={containerRef}
    >
      {children}
      {dimensions.width > 0 && dimensions.height > 0 && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-0"
          key={`wrapper-${animKey}`}
          initial={{ opacity: 0, scale: 0.95, originX: origin.originX, originY: origin.originY }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <motion.div
            className={cn(
              "absolute inset-0 border border-neutral-800 dark:border-neutral-200",
              rectangleClassName,
            )}
            initial={{ width: 0, height: 0 }}
            animate={{ width: dimensions.width, height: dimensions.height }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              x: dimensions.width + 4,
              y: dimensions.height + 4,
            }}
            style={{ rotate: -90 }}
            transition={{
              opacity: { duration: 0.1, ease: "easeInOut" },
              duration: 1,
              ease: "easeInOut",
            }}
          >
            <Pointer
              className={cn("h-5 w-5 text-blue-500", pointerClassName)}
            />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

const Pointer = ({ ...props }: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      stroke="currentColor"
      fill="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103z"></path>
    </svg>
  );
};
