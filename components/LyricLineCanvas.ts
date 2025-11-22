import { LyricLine } from "../types";

// Constants matching DOM implementation
const GLOW_STYLE = "rgba(255,255,255,0.8)";

export interface WordLayout {
    text: string;
    x: number;
    y: number; // Relative Y offset within the line block
    width: number;
    startTime: number;
    endTime: number;
    isVerbatim: boolean; // To distinguish between timed words and wrapped segments
}

export interface LineLayout {
    y: number; // Absolute Y position in the document
    height: number;
    words: WordLayout[];
    fullText: string;
    translation?: string;
    translationLines?: string[]; // New field for wrapped translation
    textWidth: number; // Max width of the text block
}

const detectLanguage = (text: string) => {
    const cjkRegex = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/;
    return cjkRegex.test(text) ? "zh" : "en";
};

// Font configuration
const getFonts = (isMobile: boolean) => {
    // Sizes matched to previous Tailwind classes (text-3xl/4xl/5xl)
    const baseSize = isMobile ? 32 : 40;
    const transSize = isMobile ? 18 : 22;
    return {
        main: `800 ${baseSize}px "PingFang SC", "Inter", sans-serif`,
        trans: `500 ${transSize}px "PingFang SC", "Inter", sans-serif`,
        mainHeight: baseSize, // Increased line height for better wrapping
        transHeight: transSize * 1.3,
    };
};

interface MeasureLineOptions {
    ctx: CanvasRenderingContext2D;
    line: LyricLine;
    segmenter: Intl.Segmenter | null;
    lang: string;
    maxWidth: number;
    baseSize: number;
    mainHeight: number;
    paddingY: number;
    mainFont: string;
}

const measureLine = ({
    ctx,
    line,
    segmenter,
    lang,
    maxWidth,
    baseSize,
    mainHeight,
    paddingY,
    mainFont,
}: MeasureLineOptions) => {
    ctx.font = mainFont;

    const words: WordLayout[] = [];
    let currentLineX = 0;
    let currentLineY = paddingY;
    let maxLineWidth = 0;

    const addWord = (text: string, start: number, end: number, isVerbatim: boolean) => {
        const metrics = ctx.measureText(text);
        let width = metrics.width;
        if (width === 0 && text.trim().length > 0) {
            width = text.length * (baseSize * 0.5);
        }

        if (currentLineX + width > maxWidth && currentLineX > 0) {
            currentLineX = 0;
            currentLineY += mainHeight;
        }

        words.push({
            text,
            x: currentLineX,
            y: currentLineY,
            width,
            startTime: start,
            endTime: end,
            isVerbatim,
        });

        currentLineX += width;
        maxLineWidth = Math.max(maxLineWidth, currentLineX);
    };

    if (line.words && line.words.length > 0) {
        line.words.forEach((w) => {
            addWord(w.text, w.startTime, w.endTime, true);
        });
    } else if (segmenter) {
        const segments = segmenter.segment(line.text);
        for (const seg of segments) {
            addWord(seg.segment, line.time, 999999, false);
        }
    } else if (lang === "zh") {
        line.text.split("").forEach((c) => {
            addWord(c, line.time, 999999, false);
        });
    } else {
        const wordsArr = line.text.split(" ");
        wordsArr.forEach((word, index) => {
            addWord(word, line.time, 999999, false);
            if (index < wordsArr.length - 1) {
                addWord(" ", line.time, 999999, false);
            }
        });
    }

    return {
        words,
        textWidth: maxLineWidth,
        height: currentLineY + mainHeight,
    };
};

interface MeasureTranslationOptions {
    ctx: CanvasRenderingContext2D;
    translation: string;
    maxWidth: number;
    transHeight: number;
    transFont: string;
}

const measureTranslationLines = ({
    ctx,
    translation,
    maxWidth,
    transHeight,
    transFont,
}: MeasureTranslationOptions) => {
    ctx.font = transFont;
    const isEn = detectLanguage(translation) === "en";
    const atoms = isEn ? translation.split(" ") : translation.split("");

    const lines: string[] = [];
    let currentTransLine = "";
    let currentTransWidth = 0;

    atoms.forEach((atom, index) => {
        const atomText = isEn && index < atoms.length - 1 ? atom + " " : atom;
        const width = ctx.measureText(atomText).width;

        if (currentTransWidth + width > maxWidth && currentTransWidth > 0) {
            lines.push(currentTransLine);
            currentTransLine = atomText;
            currentTransWidth = width;
        } else {
            currentTransLine += atomText;
            currentTransWidth += width;
        }
    });

    if (currentTransLine) {
        lines.push(currentTransLine);
    }

    return {
        lines,
        height: lines.length ? lines.length * transHeight + 4 : 0,
    };
};

export const measureLyrics = (
    ctx: CanvasRenderingContext2D,
    lyrics: LyricLine[],
    containerWidth: number,
    isMobile: boolean,
): { layouts: LineLayout[]; totalHeight: number } => {
    const { main, trans, mainHeight, transHeight } = getFonts(isMobile);
    const baseSize = isMobile ? 32 : 40;
    const paddingY = 12; // Vertical padding of the line box
    const marginY = 12; // Gap between lines (Reduced from 12)
    const paddingX = isMobile ? 24 : 56;
    const maxWidth = containerWidth - paddingX * 2;

    const layouts: LineLayout[] = [];
    let currentY = 0;

    // Detect dominant language from the first few lines
    const sampleText = lyrics.slice(0, 5).map(l => l.text).join(" ");
    const lang = detectLanguage(sampleText);

    // Important: Set baseline before measuring
    ctx.textBaseline = "top"; // Ensure consistent baseline for measurement

    // Segmenter for wrapping plain text
    // @ts-ignore: Intl.Segmenter is available in modern browsers
    const segmenter = typeof Intl !== "undefined" && Intl.Segmenter
        ? new Intl.Segmenter(lang, { granularity: "word" })
        : null;

    lyrics.forEach((line) => {
        const { words, textWidth, height: lineHeight } = measureLine({
            ctx,
            line,
            segmenter,
            lang,
            maxWidth,
            baseSize,
            mainHeight,
            paddingY,
            mainFont: main,
        });
        let blockHeight = lineHeight;

        let translationLines: string[] | undefined = undefined;
        if (line.translation) {
            const translationResult = measureTranslationLines({
                ctx,
                translation: line.translation,
                maxWidth,
                transHeight,
                transFont: trans,
            });
            translationLines = translationResult.lines;
            blockHeight += translationResult.height;
        }

        blockHeight += paddingY;

        layouts.push({
            y: currentY,
            height: blockHeight,
            words,
            fullText: line.text,
            translation: line.translation,
            translationLines,
            textWidth,
        });

        currentY += blockHeight + marginY;
    });

    // Add significant bottom padding to ensure the last line can scroll up to the focal point
    // Focal point is roughly 35% of screen height. 
    // We add enough space so the last line can be at the top 35%.
    return { layouts, totalHeight: currentY + containerWidth * 0.8 };
};

export const drawLyricLine = (
    ctx: CanvasRenderingContext2D,
    layout: LineLayout,
    x: number,
    y: number,
    scale: number,
    opacity: number,
    blur: number,
    isActive: boolean,
    currentTime: number,
    isMobile: boolean,
    isHovered: boolean,
) => {
    const { main, trans, mainHeight } = getFonts(isMobile);

    ctx.save();

    // Apply transformations
    // Pivot point for scale should be center of the block
    const cy = y + layout.height / 2;
    ctx.translate(x, cy);
    ctx.scale(scale, scale);
    ctx.translate(0, -layout.height / 2); // Move back to top-left of the block (relative to center)

    // Opacity & Filter
    ctx.globalAlpha = opacity;
    // Fix: Clamp small blur values to 0 to prevent sub-pixel rendering artifacts (ghosting)
    if (blur > 0.5) {
        ctx.filter = `blur(${blur}px)`;
    } else {
        ctx.filter = "none";
    }

    // Hover Background
    if (isHovered) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        // Draw rounded rectangle covering the whole block
        const bgWidth = Math.max(layout.textWidth + 32, 200);
        roundRect(ctx, -16, 0, bgWidth, layout.height, 16);
        ctx.fill();
    }

    // Draw Main Text
    ctx.font = main;
    ctx.textBaseline = "top";

    if (!isActive) {
        // Inactive: plain white (dimmed to distinguish from active line)
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        layout.words.forEach((w) => {
            ctx.fillText(w.text, w.x, w.y);
        });
    } else {
        // Active: Karaoke effects
        layout.words.forEach((w) => {
            drawLyricWord(ctx, w, currentTime);
        });
    }

    // Draw Translation
    if (layout.translationLines && layout.translationLines.length > 0) {
        ctx.font = trans;
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";

        const lastWordY = layout.words.length > 0 ? layout.words[layout.words.length - 1].y : 0;
        let transY = lastWordY + mainHeight * 1.2;

        layout.translationLines.forEach(lineText => {
            ctx.fillText(lineText, 0, transY);
            transY += getFonts(isMobile).transHeight;
        });
    }

    ctx.restore();
};

/**
 * Draws a single word during the active state, choosing between a glow-heavy
 * treatment and the simpler lift/gradient animation.
 */
function drawLyricWord(
    ctx: CanvasRenderingContext2D,
    word: WordLayout,
    currentTime: number,
) {
    ctx.save();
    ctx.translate(word.x, word.y);

    const duration = word.endTime - word.startTime;
    const elapsed = currentTime - word.startTime;

    if (currentTime < word.startTime) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.fillText(word.text, 0, 0);
    } else if (currentTime > word.endTime) {
        ctx.fillStyle = "#ffffff";
        const liftMax = -3;
        ctx.translate(0, liftMax);
        ctx.fillText(word.text, 0, 0);
    } else {
        let progress = 0;
        if (duration > 0) {
            progress = Math.max(0, Math.min(1, elapsed / duration));
        }

        const useGlow = duration > 1.5 && word.text.length < 7;
        if (useGlow) {
            drawGlowAnimation(ctx, word, currentTime, elapsed, duration);
        } else {
            drawStandardAnimation(ctx, word, progress, duration);
        }
    }

    ctx.restore();
}

function drawGlowAnimation(
    ctx: CanvasRenderingContext2D,
    word: WordLayout,
    currentTime: number,
    elapsed: number,
    duration: number,
) {
    const MAX_GLOW_DURATION = 1.0 + (word.text.length * 0.25);
    const effectiveDuration = Math.min(duration, MAX_GLOW_DURATION);
    const isAnimating = elapsed < effectiveDuration;

    let breathBlur = 20;
    let breathScale = 1.0;

    if (isAnimating) {
        const breath = Math.sin(currentTime * 3);
        breathBlur = 20 + 5 * breath;
        breathScale = 1.0 + 0.02 * breath;
    }

    ctx.shadowColor = "rgba(255, 255, 255, 0.6)";
    ctx.shadowBlur = breathBlur;

    const chars = word.text.split("");
    if (chars.length === 0) {
        ctx.fillText(word.text, 0, 0);
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
        return;
    }

    let charX = 0;

    let effectiveP = 0;
    if (effectiveDuration > 0) {
        effectiveP = Math.max(0, Math.min(1, elapsed / effectiveDuration));
    }
    if (!isAnimating) effectiveP = 1;

    const spread = 3.0;
    const activeIndex = effectiveP * (chars.length + spread * 2) - spread;

    chars.forEach((char, charIndex) => {
        const charWidth = ctx.measureText(char).width;
        const dist = Math.abs(charIndex - activeIndex);

        const maxScale = 1.05;
        const scaleDelta = maxScale - 1.0;
        const gaussian = Math.exp(-(dist * dist) / (2 * spread * spread));
        const currentScale = isAnimating ? (1.0 + scaleDelta * gaussian) : 1.0;
        const charScale = currentScale * breathScale;

        ctx.save();
        ctx.translate(charX, 0);
        ctx.translate(charWidth / 2, 0);
        ctx.scale(charScale, charScale);
        ctx.translate(-charWidth / 2, 0);

        if (!isAnimating) {
            ctx.fillStyle = "#ffffff";
        } else {
            const charStartTime = word.startTime + (charIndex / chars.length) * effectiveDuration;
            if (currentTime >= charStartTime) {
                ctx.fillStyle = "#ffffff";
            } else {
                const brightness = 0.5 + 0.5 * gaussian;
                ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
            }
        }

        ctx.fillText(char, 0, 0);
        ctx.restore();

        charX += charWidth;
    });

    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
}

function drawStandardAnimation(
    ctx: CanvasRenderingContext2D,
    word: WordLayout,
    progress: number,
    duration: number,
) {
    const liftMax = -2;
    const lift = liftMax * Math.sin(progress * Math.PI / 2);
    ctx.translate(0, lift);

    if (word.isVerbatim && duration > 1.5) {
        ctx.shadowColor = GLOW_STYLE;
        ctx.shadowBlur = 10 * Math.sin(progress * Math.PI);
    }

    const gradientWidth = Math.max(word.width, 1);
    const gradient = ctx.createLinearGradient(0, 0, gradientWidth, 0);
    const startStop = Math.max(0, Math.min(1, progress - 0.2));
    const endStop = Math.max(0, Math.min(1, progress + 0.2));

    if (isFinite(startStop) && isFinite(endStop)) {
        gradient.addColorStop(startStop, "#ffffff");
        gradient.addColorStop(endStop, "rgba(255, 255, 255, 0.5)");
    } else {
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0.5)");
    }

    ctx.fillStyle = gradient;
    ctx.fillText(word.text, 0, 0);

    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
}

function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}
