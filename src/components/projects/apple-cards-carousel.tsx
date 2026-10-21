'use client';
import { DottedGlowBackground } from '@/components/ui/dotted-glow-background';
import { useOutsideClick } from '@/hooks/use-outside-click';
import { cn } from '@/lib/utils';
import {
  IconArrowNarrowLeft,
  IconArrowNarrowRight,
  IconX,
} from '@tabler/icons-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

export type CarouselCard = {
  title: string;
  category: string;
  tagline: string; // already resolved with the fallback; may be ''
  src: string; // cover, for the modal
  content: React.ReactNode;
};

export const CarouselContext = createContext<{
  onCardOpen: (index: number) => void;
  onCardClose: (index: number) => void;
  currentIndex: number;
  openIndex: number | null;
}>({
  onCardOpen: () => {},
  onCardClose: () => {},
  currentIndex: 0,
  openIndex: null,
});

export const Carousel = ({
  items,
  initialScroll = 0,
}: {
  items: React.ReactNode[];
  initialScroll?: number;
}) => {
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft = initialScroll;
      checkScrollability();
    }
  }, [initialScroll]);

  const checkScrollability = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    }
  };

  // Get the card width and gap based on viewport size
  const getScrollDistance = () => {
    // Card width (w-56 = 224px) + gap-4 (16px)
    const cardWidth = 224;
    const gap = 16;
    const totalWidth = cardWidth + gap;

    // Scroll by 2 cards on desktop, 1 on mobile
    const cardsToScroll = 1;
    return totalWidth * cardsToScroll;
  };

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({
        left: -getScrollDistance(),
        behavior: 'smooth',
      });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({
        left: getScrollDistance(),
        behavior: 'smooth',
      });
    }
  };

  // Stable handlers so Card effects don't re-run on every carousel render.
  const handleCardOpen = useCallback((index: number) => {
    setOpenIndex(index);
  }, []);

  const handleCardClose = useCallback((index: number) => {
    setOpenIndex(null);
    if (carouselRef.current) {
      const cardWidth = 224; // w-56 (224px)
      const gap = 16; // gap-4 (16px)
      const scrollPosition = (cardWidth + gap) * index;
      carouselRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth',
      });
      setCurrentIndex(index);
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      onCardOpen: handleCardOpen,
      onCardClose: handleCardClose,
      currentIndex,
      openIndex,
    }),
    [handleCardOpen, handleCardClose, currentIndex, openIndex]
  );

  return (
    <CarouselContext.Provider value={contextValue}>
      <div className="relative w-full">
        <div
          className="flex w-full overflow-x-scroll overscroll-x-auto scroll-smooth py-10 [scrollbar-width:none]"
          ref={carouselRef}
          onScroll={checkScrollability}
        >
          <div
            className={cn(
              'absolute right-0 z-[10] h-auto w-[5%] overflow-hidden bg-gradient-to-l'
            )}
          ></div>

          <div
            className={cn(
              'flex flex-row justify-start gap-4',
              'mx-auto max-w-7xl' // remove max-w-4xl if you want the carousel to span the full width of its container
            )}
          >
            {items.map((item, index) => (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.5,
                    delay: 0.2 * index,
                    ease: 'easeOut',
                    once: true,
                  },
                }}
                key={'card' + index}
                className="rounded-3xl last:pr-[5%] md:last:pr-[33%]"
              >
                {item}
              </motion.div>
            ))}
          </div>
        </div>
        <div className="mr-10 flex justify-end gap-2 md:mr-20">
          <button
            type="button"
            aria-label="Previous projects"
            className="relative z-40 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 ring-1 ring-white/10 transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={scrollLeft}
            disabled={!canScrollLeft}
          >
            <IconArrowNarrowLeft className="h-6 w-6 text-neutral-200" />
          </button>
          <button
            type="button"
            aria-label="Next projects"
            className="relative z-40 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 ring-1 ring-white/10 transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={scrollRight}
            disabled={!canScrollRight}
          >
            <IconArrowNarrowRight className="h-6 w-6 text-neutral-200" />
          </button>
        </div>
      </div>
    </CarouselContext.Provider>
  );
};

export const Card = ({
  card,
  index,
  layout = false,
}: {
  card: CarouselCard;
  index: number;
  layout?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const reduceMotion = useReducedMotion();
  const { onCardOpen, onCardClose, openIndex } = useContext(CarouselContext);

  const handleOpen = () => {
    setOpen(true);
    onCardOpen(index);
  };

  const handleClose = useCallback(() => {
    setOpen(false);
    onCardClose(index);
  }, [onCardClose, index]);

  // Esc, scroll lock and focus only apply while this card is open.
  useEffect(() => {
    if (!open) return;
    const face = faceRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      face?.focus({ preventScroll: true });
    };
  }, [open, handleClose]);

  useOutsideClick(containerRef as React.RefObject<HTMLDivElement>, handleClose);

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-52 h-screen overflow-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 h-full w-full bg-black/80 backdrop-blur-lg"
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              ref={containerRef}
              layoutId={layout ? `card-${card.title}` : undefined}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="relative z-[60] mx-auto my-10 h-fit max-w-5xl rounded-3xl bg-white font-sans dark:bg-neutral-900"
            >
              {/* Sticky close button */}
              <div className="sticky top-4 z-52 flex justify-end px-8 pt-8 md:px-14 md:pt-8">
                <button
                  ref={closeRef}
                  type="button"
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/90 shadow-md focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none dark:bg-white/90"
                  onClick={handleClose}
                >
                  <IconX className="h-6 w-6 text-neutral-100 dark:text-neutral-900" />
                </button>
              </div>

              {/* Header section with consistent padding */}
              <div className="relative px-8 pt-2 pb-0 md:px-14">
                <div>
                  <motion.p
                    layoutId={layout ? `category-${card.title}` : undefined}
                    className="text-base font-medium text-black dark:text-white"
                  >
                    {card.category}
                  </motion.p>
                  <motion.p
                    id={titleId}
                    layoutId={layout ? `title-${card.title}` : undefined}
                    className="mt-4 text-2xl font-semibold text-neutral-700 md:text-5xl dark:text-white"
                  >
                    {card.title}
                  </motion.p>
                </div>
              </div>

              {/* Content with consistent padding */}
              <div className="px-8 pt-8 pb-14 md:px-14">{card.content}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <motion.button
        ref={faceRef}
        type="button"
        layoutId={layout ? `card-${card.title}` : undefined}
        onClick={handleOpen}
        whileHover={reduceMotion ? undefined : { y: -4 }}
        aria-label={`Open ${card.title}`}
        className="group bg-background relative z-10 flex h-80 w-56 flex-col overflow-hidden rounded-3xl p-6 text-left shadow shadow-white/10 ring-1 ring-white/5 transition-shadow hover:ring-white/15 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none focus-visible:ring-inset"
      >
        {/* Dots are unmounted while any modal is open (they'd force the backdrop blur to repaint). */}
        {openIndex === null && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-0"
          >
            <DottedGlowBackground
              className="[mask-image:radial-gradient(ellipse_at_center,black,transparent_90%)]"
              gap={16}
              radius={1.6}
              opacity={1}
              backgroundOpacity={0}
              speedMin={0.3}
              speedMax={1.6}
              speedScale={reduceMotion ? 0 : 1}
              darkColor="rgb(115 115 115)" // neutral-500
              darkGlowColor="rgb(7 89 133)" // sky-800
            />
          </div>
        )}
        <motion.p
          layoutId={layout ? `category-${card.title}` : undefined}
          className="relative z-10 w-full truncate text-sm font-medium text-neutral-400"
        >
          {card.category}
        </motion.p>
        <div className="relative z-10 flex w-full flex-1 items-center justify-center">
          <motion.p
            layoutId={layout ? `title-${card.title}` : undefined}
            className="line-clamp-3 w-full text-center text-xl font-bold break-words text-white [text-wrap:balance]"
          >
            {card.title}
          </motion.p>
        </div>
        <div className="relative z-10 flex w-full items-end justify-between gap-3 backdrop-blur-[2px]">
          {card.tagline && (
            <p className="line-clamp-2 text-xs text-neutral-400">
              {card.tagline}
            </p>
          )}
          <IconArrowNarrowRight
            aria-hidden
            className="ml-auto h-5 w-5 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-1"
          />
        </div>
      </motion.button>
    </>
  );
};
