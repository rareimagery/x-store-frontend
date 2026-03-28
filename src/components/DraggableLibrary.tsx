'use client';

export type DraggableBlockId = 'recent-posts' | 'products' | 'favorite-people' | 'ai-creations';

export const DRAGGABLE_BLOCKS: Array<{
  id: DraggableBlockId;
  label: string;
  emoji: string;
  color: string;
}> = [
  { id: 'recent-posts',     label: 'Recent X Posts',             emoji: '📜', color: 'bg-blue-950' },
  { id: 'products',         label: 'Products Showcase',           emoji: '🛒', color: 'bg-emerald-950' },
  { id: 'favorite-people',  label: 'Favorite People (Followers)', emoji: '❤️', color: 'bg-pink-950' },
  { id: 'ai-creations',     label: 'AI Creations (Grok Videos)',  emoji: '🎥', color: 'bg-purple-950' },
];

type DraggableLibraryProps = {
  onDragStart?: (id: DraggableBlockId) => void;
};

export default function DraggableLibrary({ onDragStart }: DraggableLibraryProps) {
  return (
    <div className="w-72 shrink-0 overflow-auto border-r border-zinc-800 bg-zinc-900 p-6">
      <h2 className="mb-1 text-2xl font-bold text-white">Drag Blocks</h2>
      <p className="mb-6 text-xs text-zinc-500">Drop onto the preview to inject your data</p>

      <div className="space-y-4">
        {DRAGGABLE_BLOCKS.map((block) => (
          <div
            key={block.id}
            draggable
            onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
              e.dataTransfer.setData('text/plain', block.id);
              e.dataTransfer.effectAllowed = 'copy';
              onDragStart?.(block.id);
            }}
            className={`cursor-grab rounded-xl border-2 border-zinc-700 transition-all active:cursor-grabbing hover:border-[#1DA1F2] hover:shadow-lg hover:shadow-[#1DA1F2]/10 ${block.color}`}
          >
            <div className="flex items-center gap-4 p-5 text-left">
              <div className="text-4xl">{block.emoji}</div>
              <div>
                <div className="font-semibold text-zinc-100">{block.label}</div>
                <div className="mt-0.5 text-xs text-zinc-400">
                  Drop into preview → auto-fills with your real data
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-zinc-500">
        Pro tip: Drag multiple times to stack sections
      </p>
    </div>
  );
}
