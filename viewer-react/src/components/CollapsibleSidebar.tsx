import { useState, type ReactNode } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface CollapsibleSidebarProps {
  children: ReactNode;
  initialExpanded?: boolean;
}

// GISアプリのフィルタペイン向け。地図の横幅を常に残しつつ、パネルだけを
// 320px ⇔ 0px で遷移させる。ハンドルは外側に出すため、内容のクリップ領域とは分ける。
export default function CollapsibleSidebar({
  children,
  initialExpanded = true,
}: CollapsibleSidebarProps) {
  const [expanded, setExpanded] = useState(initialExpanded);

  return (
    <aside
      className={`relative shrink-0 transition-[width] duration-250 ease-in-out ${
        expanded ? 'w-80' : 'w-0'
      }`}
    >
      <div className="h-full overflow-hidden">
        <div
          className={`h-full w-80 transition-opacity duration-200 ${
            expanded ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          aria-hidden={!expanded}
        >
          {children}
        </div>
      </div>

      {expanded ? (
        <button
          type="button"
          aria-label="左ペインを閉じる"
          aria-expanded={true}
          onClick={() => setExpanded(false)}
          className="absolute right-3 top-3 z-30 flex h-7 w-7 items-center justify-center rounded text-text-secondary transition-colors hover:bg-bg-table-head focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
        >
          <FiChevronLeft aria-hidden="true" className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          aria-label="左ペインを開く"
          aria-expanded={false}
          onClick={() => setExpanded(true)}
          className="absolute left-0 top-1/2 z-30 flex h-14 w-6 -translate-y-1/2 items-center justify-center rounded-r-full border border-l-0 border-brand-blue-light/30 bg-bg-panel text-text-secondary shadow-md transition-colors hover:bg-bg-table-head focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
        >
          <FiChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      )}
    </aside>
  );
}
