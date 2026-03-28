"use client";

import { useState, useCallback } from "react";
import { 
  BuilderDocument, 
  BuilderBlock, 
  BuilderBlockType,
  createBlock,
  createDefaultBuilderDocument 
} from "@/lib/builderDocument";

interface DragDropEditorProps {
  document: BuilderDocument;
  onChange: (document: BuilderDocument) => void;
}

const BLOCK_TYPES: { type: BuilderBlockType; label: string; icon: string }[] = [
  { type: "profile-header", label: "Profile Header", icon: "👤" },
  { type: "top-menu", label: "Top Menu", icon: "📋" },
  { type: "sidebar", label: "Sidebar", icon: "📑" },
  { type: "post-feed", label: "Post Feed", icon: "📜" },
  { type: "product-grid", label: "Product Grid", icon: "🛍️" },
  { type: "friends-list", label: "Friends List", icon: "👥" },
  { type: "media-widget", label: "Media Widget", icon: "🎵" },
  { type: "custom-embed", label: "Custom Embed", icon: "🔗" },
];

export default function DragDropEditor({ document, onChange }: DragDropEditorProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const addBlock = useCallback((type: BuilderBlockType) => {
    const newBlock = createBlock(type);
    const updated = {
      ...document,
      blocks: [...document.blocks, newBlock],
      meta: {
        ...document.meta,
        updatedAt: new Date().toISOString(),
      }
    };
    onChange(updated);
    setSelectedBlockId(newBlock.id);
  }, [document, onChange]);

  const removeBlock = useCallback((id: string) => {
    const updated = {
      ...document,
      blocks: document.blocks.filter(b => b.id !== id),
      meta: {
        ...document.meta,
        updatedAt: new Date().toISOString(),
      }
    };
    onChange(updated);
    if (selectedBlockId === id) setSelectedBlockId(null);
  }, [document, onChange, selectedBlockId]);

  const updateBlock = useCallback((id: string, updates: Partial<BuilderBlock>) => {
    const updated = {
      ...document,
      blocks: document.blocks.map(block => 
        block.id === id ? { ...block, ...updates } as BuilderBlock : block
      ),
      meta: {
        ...document.meta,
        updatedAt: new Date().toISOString(),
      }
    };
    onChange(updated);
  }, [document, onChange]);

  const selectedBlock = document.blocks.find(b => b.id === selectedBlockId);

  return (
    <div className="flex h-full gap-6">
      {/* Block Library */}
      <div className="w-64 bg-zinc-900 border border-zinc-700 rounded-3xl p-6 overflow-auto">
        <h3 className="font-semibold text-white mb-4">Blocks</h3>
        <div className="space-y-2">
          {BLOCK_TYPES.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => addBlock(type)}
              className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800 rounded-2xl text-left group transition"
            >
              <div className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-xl text-lg group-hover:bg-zinc-700">
                {icon}
              </div>
              <div>
                <div className="text-white text-sm font-medium">{label}</div>
                <div className="text-zinc-500 text-xs">Click to add</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-zinc-950 border border-zinc-700 rounded-3xl p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-semibold text-white">Your Store Layout</h3>
            <div className="text-xs text-zinc-500">
              {document.blocks.length} blocks • Drag to reorder coming soon
            </div>
          </div>

          <div className="space-y-4">
            {document.blocks.length === 0 ? (
              <div className="h-96 flex items-center justify-center border border-dashed border-zinc-700 rounded-3xl">
                <div className="text-center">
                  <div className="text-6xl mb-4">📦</div>
                  <p className="text-zinc-400">No blocks yet</p>
                  <p className="text-sm text-zinc-500 mt-1">Add blocks from the library</p>
                </div>
              </div>
            ) : (
              document.blocks.map((block) => (
                <div
                  key={block.id}
                  onClick={() => setSelectedBlockId(block.id)}
                  className={`p-6 rounded-3xl border transition-all cursor-pointer ${
                    selectedBlockId === block.id 
                      ? 'border-blue-500 bg-zinc-900/80' 
                      : 'border-zinc-700 hover:border-zinc-600 bg-zinc-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-xs text-zinc-500 mb-1">{block.type}</div>
                      <div className="text-white font-medium">
                        {(block as any).title || block.type}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                      className="text-red-400 hover:text-red-300 text-xs px-3 py-1 rounded-xl hover:bg-red-950"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Inspector */}
      <div className="w-80 bg-zinc-900 border border-zinc-700 rounded-3xl p-6 overflow-auto">
        <h3 className="font-semibold text-white mb-6">Block Inspector</h3>
        
        {!selectedBlock ? (
          <div className="text-center text-zinc-500 py-12">
            Select a block on the canvas to edit its properties
          </div>
        ) : (
          <div className="space-y-6 text-sm">
            <div>
              <label className="block text-zinc-400 mb-1.5">Block Type</label>
              <div className="bg-zinc-950 border border-zinc-700 rounded-2xl px-4 py-3 text-white">
                {selectedBlock.type}
              </div>
            </div>
            
            {/* Simple property editing would go here */}
            <div className="pt-4 border-t border-zinc-700 text-xs text-zinc-500">
              More block properties coming in v2
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
