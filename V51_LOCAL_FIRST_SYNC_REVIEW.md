# v51 local-first realtime sync

Implemented:
- Optimistic local update: scores update immediately before cloud write.
- Ignore self-origin realtime events using a per-device client id stored in localStorage.
- Diff-check before remote apply using a serialized game signature.
- Background sync queue with a single pending game ref.
- 700ms debounced cloud writes.
- Input freeze during add-round commit.
- Scoreboard isolated with React.memo.
- Local-first persistence remains through localStorage.
- Remote updates only apply if different and not stale.
