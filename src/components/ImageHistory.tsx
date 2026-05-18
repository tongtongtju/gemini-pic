import type { HistoryItem } from '../types'

interface ImageHistoryProps {
  history: HistoryItem[]
  onSelect: (item: HistoryItem) => void
  onDelete: (id: string) => void
  onClear: () => void
}

export function ImageHistory({ history, onSelect, onDelete, onClear }: ImageHistoryProps) {
  if (!history.length) return null

  return (
    <div className="mt-4 pt-4 border-t border-white/10">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-white/30 uppercase tracking-wider">History ({history.length})</p>
        <button
          onClick={onClear}
          className="text-xs text-white/20 hover:text-red-400 transition-colors"
        >
          Clear all
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {history.map(item => (
          <div
            key={item.id}
            className="relative group flex-shrink-0"
          >
            <button
              onClick={() => onSelect(item)}
              className="w-14 h-14 rounded-lg border border-white/10 overflow-hidden hover:border-[#7c3aed] transition-colors"
            >
              {item.resultImages.length > 0 ? (
                <img src={item.resultImages[0]} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/30 text-[10px]">
                  Aa
                </div>
              )}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(item.id) }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
