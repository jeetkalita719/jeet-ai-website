import Image from 'next/image';
import { ChevronRight, Link } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { PROJECTS, type Project } from '@/lib/profile';
import type { CarouselCard } from './apple-cards-carousel';

const ProjectContent = ({ project }: { project: Project }) => {
  return (
    <div className="space-y-10">
      <div className="rounded-3xl bg-[#F5F5F7] p-8 dark:bg-[#1D1D1F]">
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <span>{project.date}</span>
            <span>·</span>
            <span>{project.category}</span>
          </div>

          <p className="text-secondary-foreground font-sans text-base leading-relaxed md:text-lg">{project.description}</p>

          <div className="pt-4">
            <h3 className="mb-3 text-sm tracking-wide text-neutral-500 uppercase dark:text-neutral-400">Technologies</h3>
            <div className="flex flex-wrap gap-2">
              {project.techStack.map((tech) => (
                <span key={tech} className="rounded-full bg-neutral-200 px-3 py-1 text-sm text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {project.links.length > 0 && (
        <div className="mb-24">
          <div className="mb-4 flex items-center gap-2 px-6">
            <h3 className="text-sm tracking-wide text-neutral-500 dark:text-neutral-400">Links</h3>
            <Link className="text-muted-foreground w-4" />
          </div>
          <Separator className="my-4" />
          <div className="space-y-3">
            {project.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-xl bg-[#F5F5F7] p-4 transition-colors hover:bg-[#E5E5E7] dark:bg-neutral-800 dark:hover:bg-neutral-700"
              >
                <span className="font-light capitalize">{link.name}</span>
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="relative aspect-video overflow-hidden rounded-2xl">
        <Image src={project.cover} alt={project.title} fill className="object-cover" />
      </div>
    </div>
  );
};

// Hue is a circle: wrap out-of-range values instead of clamping (400 → 40).
const normalizeHue = (h: number) => ((h % 360) + 360) % 360;

// Empty string means "hide the tagline".
const resolveTagline = (p: Project) => p.tagline ?? p.techStack.slice(0, 3).join(' · ');

// Titles double as layoutIds, so duplicates would break the open/close animation.
if (process.env.NODE_ENV !== 'production') {
  const seen = new Set<string>();
  for (const p of PROJECTS) {
    if (seen.has(p.title)) console.warn(`[projects] Duplicate project title: "${p.title}"`);
    seen.add(p.title);
  }
}

export const data: CarouselCard[] = PROJECTS.map((p) => ({
  category: p.category,
  title: p.title,
  tagline: resolveTagline(p),
  hue: normalizeHue(p.hue),
  src: p.cover,
  content: <ProjectContent project={p} />,
}));
