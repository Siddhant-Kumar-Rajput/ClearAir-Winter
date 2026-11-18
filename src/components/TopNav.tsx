import type { User } from 'firebase/auth';

export type WorkspaceTab = 'overview' | 'plan' | 'impact' | 'community';

interface TopNavProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  user: User | null;
  authReady: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

const NAV_ITEMS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'plan', label: 'Daily Plan' },
  { id: 'impact', label: 'Impact Lab' },
  { id: 'community', label: 'Community' },
];

export function TopNav({
  activeTab,
  onSelectTab,
  user,
  authReady,
  onSignIn,
  onSignOut,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#E2E8F0]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#main-content"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('overview');
          }}
          className="text-lg font-bold tracking-tight text-[#0F172A] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0369A1] rounded"
        >
          ClearAir Winter
        </a>

        {/* Zone 2: 4 single-line navigation tabs */}
        <nav
          aria-label="Primary workspace sections"
          className="hidden md:flex items-center gap-6"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelectTab(item.id)}
                className={`py-2 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0369A1] ${
                  isActive
                    ? 'text-[#0369A1] border-[#0369A1]'
                    : 'text-[#475569] border-transparent hover:text-[#0F172A]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          {!authReady ? (
            <span className="text-xs text-[#64748B] whitespace-nowrap">
              Checking session...
            </span>
          ) : user ? (
            <button
              type="button"
              onClick={onSignOut}
              title={`Signed in as ${user.displayName || user.email || 'Account'}`}
              className="px-4 py-2 min-h-[40px] text-sm font-medium text-[#0F172A] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0369A1]"
            >
              Sign Out
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="px-4 py-2 min-h-[40px] text-sm font-medium text-white bg-[#0369A1] hover:bg-[#075985] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0369A1]"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Mobile compact single-line nav row */}
      <nav
        aria-label="Mobile workspace sections"
        className="flex md:hidden items-center justify-between px-4 border-t border-[#F1F5F9] overflow-x-auto"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelectTab(item.id)}
              className={`py-2.5 px-2 text-xs font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                isActive
                  ? 'text-[#0369A1] border-[#0369A1]'
                  : 'text-[#475569] border-transparent'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
