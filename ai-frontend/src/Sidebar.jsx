const StarIcon = ({ filled }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

export default function Sidebar({
  t,
  conversations,
  activeId,
  onSelect,
  onNew,
  onToggleStar,
  onDelete,
  showStarredOnly,
  onToggleStarredFilter,
  open,
}) {
  const visible = showStarredOnly ? conversations.filter((c) => c.starred) : conversations;
  const starredCount = conversations.filter((c) => c.starred).length;

  return (
    <div className={`sidebar ${open ? "open" : "closed"}`}>
      <div className="sidebar-top">
        <button className="sidebar-new" onClick={onNew} type="button">
          <span>+</span> New chat
        </button>
        <button
          className={`sidebar-star-badge ${showStarredOnly ? "active" : ""}`}
          onClick={onToggleStarredFilter}
          title={showStarredOnly ? "Show all chats" : "Show starred chats"}
          type="button"
        >
          <StarIcon filled={showStarredOnly} />
          {starredCount > 0 && <span className="star-count">{starredCount}</span>}
        </button>
      </div>

      <div className="sidebar-list">
        {visible.length === 0 && (
          <div className="sidebar-empty">
            {showStarredOnly ? "No starred chats yet" : "No conversations yet"}
          </div>
        )}
        {visible.map((c) => (
          <div
            key={c.id}
            className={`sidebar-item ${c.id === activeId ? "active" : ""}`}
            onClick={() => onSelect(c)}
          >
            <span className="sidebar-item-title">{c.title || "New chat"}</span>
            <div className="sidebar-item-actions">
              <button
                className={`sidebar-icon-btn ${c.starred ? "starred" : ""}`}
                onClick={(e) => { e.stopPropagation(); onToggleStar(c); }}
                title={c.starred ? "Unstar" : "Star (keeps this chat from auto-deleting)"}
                type="button"
              >
                <StarIcon filled={c.starred} />
              </button>
              <button
                className="sidebar-icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm("Delete this conversation? This can't be undone.")) onDelete(c);
                }}
                title="Delete"
                type="button"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        ))}
      </div>

      {!showStarredOnly && (
        <div className="sidebar-note">Unstarred chats auto-delete after 1 hour</div>
      )}
    </div>
  );
}