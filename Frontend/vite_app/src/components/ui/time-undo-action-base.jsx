import { Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import useMeasure from "react-use-measure";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function TimedUndoAction({
  initialSeconds = 10,
  deleteLabel = "Delete Account",
  undoLabel = "Cancel Deletion",
  icon,
  onExpire,
  disabled = false,
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [countDown, setCountDown] = useState(initialSeconds);
  const [ref, bounds] = useMeasure({ offsetSize: true });

  const handleDelete = () => {
    if (disabled) return;
    setIsDeleting((prev) => {
      const next = !prev;
      if (next) setCountDown(initialSeconds);
      return next;
    });
  };

  useEffect(() => {
    if (!isDeleting || disabled) return;

    const interval = setInterval(() => {
      setCountDown((prev) => {
        if (prev <= 1) {
          setIsDeleting(false);
          onExpire?.();
          return initialSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isDeleting, initialSeconds, onExpire, disabled]);

  return (
    <div className="flex w-full items-center justify-start font-sans">
      <div className="flex flex-col items-start justify-center will-change-transform">
        <MotionConfig
          transition={{
            type: "spring",
            stiffness: 250,
            damping: 22,
          }}
        >
          <motion.div
            className={cn(
              "relative flex items-center justify-start overflow-hidden rounded-xl border border-orange-300/70 bg-gradient-to-r from-orange-500 to-orange-600 transition-colors duration-300",
              isDeleting && "border-orange-300 bg-orange-50",
              disabled && "cursor-not-allowed opacity-70",
              !disabled && "cursor-pointer"
            )}
            animate={{
              width: bounds.width > 0 ? bounds.width : "auto",
            }}
            onClick={handleDelete}
          >
            <div
              className={cn(
                "flex items-center justify-center gap-2 px-6 py-3",
                isDeleting && "px-3"
              )}
              ref={ref}
            >
              <AnimatePresence mode="popLayout">
                {isDeleting && (
                  <motion.div
                    className="rounded-lg bg-orange-600 p-2"
                    initial={{ opacity: 0, filter: "blur(2px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, filter: "blur(2px)" }}
                  >
                    {icon ?? <Undo2 className="size-5 text-white" />}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center justify-center gap-2">
                <AnimatedText
                  text={isDeleting ? undoLabel : deleteLabel}
                  className={cn(
                    "z-10 text-base font-semibold",
                    isDeleting ? "text-orange-700" : "text-white"
                  )}
                />
              </div>

              <AnimatePresence mode="popLayout">
                {isDeleting && (
                  <motion.div
                    className="flex items-center justify-center rounded-lg bg-orange-600 px-3 py-1 text-white tabular-nums"
                    initial={{ opacity: 0, filter: "blur(2px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, filter: "blur(2px)" }}
                  >
                    <AnimatePresence mode="popLayout">
                      <motion.span
                        key={countDown}
                        className="text-base"
                        initial={{ opacity: 0, y: -20, filter: "blur(2px)", scale: 0.5 }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
                        exit={{ opacity: 0, y: 20, filter: "blur(2px)", scale: 0.5 }}
                        transition={{
                          type: "spring",
                          stiffness: 240,
                          damping: 20,
                          mass: 1,
                        }}
                      >
                        {countDown}
                      </motion.span>
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </MotionConfig>
      </div>
    </div>
  );
}

function AnimatedText({ text, className, delayStep = 0.014 }) {
  const chars = text.split("");

  return (
    <span className={className} style={{ display: "inline-flex" }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={text} style={{ display: "inline-flex", willChange: "transform" }}>
          {chars.map((char, i) => (
            <motion.span
              key={`${char}-${i}`}
              initial={{ y: 10, opacity: 0, scale: 0.5, filter: "blur(2px)" }}
              animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ y: -10, opacity: 0, scale: 0.5, filter: "blur(2px)" }}
              transition={{
                type: "spring",
                stiffness: 240,
                damping: 16,
                mass: 1.2,
                delay: i * delayStep,
              }}
              style={{
                display: "inline-block",
                whiteSpace: char === " " ? "pre" : undefined,
              }}
            >
              {char}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default TimedUndoAction;
