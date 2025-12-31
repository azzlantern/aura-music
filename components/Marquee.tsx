
import React, { useEffect, useRef, useState } from "react";

interface MarqueeProps {
    text: string;
    className?: string;
    speed?: number; // pixels per second
    pauseOnHover?: boolean;
    delay?: number; // seconds before starting
}

const Marquee: React.FC<MarqueeProps> = ({
    text,
    className = "",
    speed = 30, // Default speed: 30px/s
    pauseOnHover = true,
    delay = 1.5,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const [shouldScroll, setShouldScroll] = useState(false);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (!containerRef.current || !textRef.current) return;

        const containerWidth = containerRef.current.clientWidth;
        const textWidth = textRef.current.scrollWidth;

        if (textWidth > containerWidth) {
            setShouldScroll(true);
            // Calculate duration needed for one full cycle: (distance / speed)
            // distance = textWidth (one full length)
            const dist = textWidth;
            const t = dist / speed;
            setDuration(t);
        } else {
            setShouldScroll(false);
            setDuration(0);
        }
    }, [text, speed]);

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden w-full whitespace-nowrap mask-gradient ${className}`}
            style={{
                maskImage: shouldScroll ? 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)' : 'none',
                WebkitMaskImage: shouldScroll ? 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)' : 'none'
            }}
        >
            <div
                ref={textRef}
                className={`inline-block ${shouldScroll ? "animate-marquee" : ""}`}
                style={
                    shouldScroll
                        ? {
                            animationDuration: `${duration}s`,
                            animationDelay: `${delay}s`,
                            paddingRight: "50px", // Gap between repeats
                        }
                        : {}
                }
            >
                {text}
            </div>
            {shouldScroll && (
                <div
                    className="animate-marquee inline-block"
                    style={{
                        animationDuration: `${duration}s`,
                        animationDelay: `${delay}s`,
                        paddingRight: "50px",
                    }}
                    aria-hidden="true"
                >
                    {text}
                </div>
            )}
        </div>
    );
};

export default Marquee;
