"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ImageIcon, Maximize2 } from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { contentService } from "@/services";
import { Container, Section } from "@/components/ui";
import { Skeleton } from "@/components/ui/Skeleton";
import { AsyncBoundary } from "@/components/feedback/AsyncBoundary";
import { EmptyState } from "@/components/feedback/states";
import { cn } from "@/lib/utils";
import { easePremium } from "@/lib/motion";
import type { GalleryItem } from "@/types";

export function GalleryView() {
  const { data, status, error, reload } = useAsync(() => contentService.getGallery(), []);
  const [filter, setFilter] = useState("All");
  const [active, setActive] = useState<number | null>(null);

  const all = useMemo(() => data ?? [], [data]);
  const categories = useMemo(() => ["All", ...Array.from(new Set(all.map((g) => g.category)))], [all]);
  const items = useMemo<GalleryItem[]>(
    () => (filter === "All" ? all : all.filter((g) => g.category === filter)),
    [all, filter],
  );

  const close = useCallback(() => setActive(null), []);
  const next = useCallback(() => setActive((i) => (i === null ? i : (i + 1) % items.length)), [items.length]);
  const prev = useCallback(() => setActive((i) => (i === null ? i : (i - 1 + items.length) % items.length)), [items.length]);

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [active, close, next, prev]);

  return (
    <Section className="pt-6">
      <Container>
        {/* Category filters */}
        {status === "success" && (
          <div className="mb-10 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => { setFilter(c); setActive(null); }}
                aria-pressed={filter === c}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  filter === c ? "border-accent bg-accent/10 text-accent" : "border-line text-muted hover:text-primary-foreground",
                )}
              >
                {c}
                {c !== "All" && (
                  <span className="ml-1.5 text-xs opacity-60">{all.filter((g) => g.category === c).length}</span>
                )}
              </button>
            ))}
          </div>
        )}

        <AsyncBoundary
          status={status}
          error={error}
          onRetry={reload}
          loading={
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3] w-full" />
              ))}
            </div>
          }
          empty={<EmptyState title="No gallery images yet" icon={<ImageIcon className="h-7 w-7" />} />}
        >
          {/* Uniform, consistent grid — no ragged masonry */}
          <motion.div
            layout
            className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4"
          >
            <AnimatePresence mode="popLayout">
              {items.map((item, i) => (
                <motion.button
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.35, ease: easePremium }}
                  onClick={() => setActive(i)}
                  aria-label={`Open ${item.title}`}
                  className={cn(
                    "group relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    // first tile is a hero on larger screens for a premium bento feel
                    i === 0 && "col-span-2 row-span-2 aspect-square sm:aspect-auto lg:col-span-2 lg:row-span-2",
                  )}
                >
                  <Image
                    src={item.imageUrl!}
                    alt={item.title}
                    fill
                    sizes={i === 0 ? "(max-width:768px) 100vw, 50vw" : "(max-width:768px) 50vw, 25vw"}
                    className="object-cover object-center transition-transform duration-[600ms] ease-premium group-hover:scale-[1.07]"
                    loading={i < 4 ? "eager" : "lazy"}
                  />
                  {/* Always-on gentle bottom gradient for legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-transparent to-transparent" />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                      <Maximize2 className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <span className="inline-block rounded-full bg-accent/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent backdrop-blur-sm">
                      {item.category}
                    </span>
                    <p className={cn("mt-1.5 font-semibold leading-tight", i === 0 ? "text-base sm:text-lg" : "text-sm")}>{item.title}</p>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        </AsyncBoundary>
      </Container>

      {/* Lightbox */}
      <AnimatePresence>
        {active !== null && items[active] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink-900/95 p-4 backdrop-blur-xl sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-label={items[active].title}
            onClick={close}
          >
            <div className="absolute left-1/2 top-5 flex -translate-x-1/2 items-center gap-3 text-sm text-muted">
              <span className="rounded-full bg-white/10 px-3 py-1 font-medium">{active + 1} / {items.length}</span>
            </div>
            <button onClick={close} className="absolute right-4 top-4 rounded-full bg-white/10 p-2.5 transition-colors hover:bg-white/20" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 transition-colors hover:bg-white/20 sm:left-6" aria-label="Previous">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <motion.figure
              key={items[active].id}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: easePremium }}
              className="relative flex max-h-[82vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex-1">
                <Image
                  src={items[active].imageUrl!}
                  alt={items[active].title}
                  width={items[active].width}
                  height={items[active].height}
                  className="mx-auto max-h-[74vh] w-auto rounded-2xl object-contain"
                />
              </div>
              <figcaption className="mt-4 text-center">
                <span className="text-xs font-bold uppercase tracking-widest text-accent">{items[active].category}</span>
                <p className="mt-1 text-lg font-semibold">{items[active].title}</p>
              </figcaption>
            </motion.figure>
            <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 transition-colors hover:bg-white/20 sm:right-6" aria-label="Next">
              <ChevronRight className="h-6 w-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  );
}
