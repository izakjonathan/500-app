"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CURRENT_GAME_ID, supabase } from "../lib/supabaseClient";

type Player = { id: string; name: string; color: string };
type Round = { id: string; scores: Record<string, number>; closedBy: string | null; starterId: string; deleted?: boolean };
type HistoryItem = { gameId: string; gameName: string; winnerName: string; rounds: number; finishedAt: string };
type Game = { gameId: string | null; gameName: string; players: Player[]; targetScore: number; starterId: string; rounds: Round[]; status: "active" | "finished"; winnerId: string | null };

const DEFAULT_PLAYERS: Player[] = [
  { id: "p1", name: "You", color: "#ffd36b" },
  { id: "p2", name: "GF", color: "#82efaa" },
  { id: "p3", name: "Player 3", color: "#93c5fd" },
  { id: "p4", name: "Player 4", color: "#f0abfc" }
];

const STORAGE_KEY = "rummy500_clean_v36";
const HISTORY_KEY = "rummy500_clean_v36_history";

function createDefaultGame(): Game {
  return { gameId: null, gameName: "No game", players: DEFAULT_PLAYERS.slice(0, 2), targetScore: 1500, starterId: "p1", rounds: [], status: "active", winnerId: null };
}
function activeRounds(rounds: Round[]) { return rounds.filter((round) => !round.deleted); }
function totals(game: Game) {
  const result: Record<string, number> = {};
  game.players.forEach((player) => { result[player.id] = 0; });
  activeRounds(game.rounds).forEach((round) => {
    game.players.forEach((player) => {
      result[player.id] += Number(round.scores[player.id] || 0);
      if (round.closedBy === player.id) result[player.id] += 15;
    });
  });
  return result;
}
function signed(value: number) { return value > 0 ? `+${value}` : String(value); }
function haptic(pattern: number | number[] = 8) { if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern); }

export default function RummyApp() {
  const [game, setGame] = useState<Game>(() => createDefaultGame());
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [closedBy, setClosedBy] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showRoundsPopup, setShowRoundsPopup] = useState(false);
  const [gameOpen, setGameOpen] = useState(false);
  const [playerCount, setPlayerCount] = useState(2);
  const [target, setTarget] = useState<number | "custom">(1500);
  const [customTarget, setCustomTarget] = useState("");
  const [gameName, setGameName] = useState("");
  const [names, setNames] = useState<string[]>(DEFAULT_PLAYERS.map((p) => p.name));
  const [syncStatus, setSyncStatus] = useState<"loading" | "synced" | "syncing" | "offline">("loading");
  const cloudLoaded = useRef(false);
  const applyingRemote = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
    }
  }, []);

  useEffect(() => {
    try {
      const savedGame = localStorage.getItem(STORAGE_KEY);
      const savedHistory = localStorage.getItem(HISTORY_KEY);
      if (savedGame) setGame(JSON.parse(savedGame));
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch {}
  }, []);

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(game)); } catch {} }, [game]);
  useEffect(() => { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {} }, [history]);

  useEffect(() => {
    let mounted = true;

    async function loadCloud() {
      const { data } = await supabase
        .from("rummy_current_game")
        .select("game_state")
        .eq("id", CURRENT_GAME_ID)
        .maybeSingle();

      if (!mounted) return;

      if (data?.game_state) {
        applyingRemote.current = true;
        setGame(data.game_state as Game);

        setTimeout(() => {
          applyingRemote.current = false;
        }, 0);
      }

      cloudLoaded.current = true;
      setSyncStatus("synced");
    }

    loadCloud();

    const channel = supabase
      .channel("rummy-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rummy_current_game",
          filter: `id=eq.${CURRENT_GAME_ID}`
        },
        (payload) => {
          const row = payload.new as { game_state?: Game };

          if (!row?.game_state) return;

          applyingRemote.current = true;
          setGame(row.game_state);

          setTimeout(() => {
            applyingRemote.current = false;
          }, 0);

          setSyncStatus("synced");
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!cloudLoaded.current || applyingRemote.current) return;

    setSyncStatus("syncing");

    const timeout = setTimeout(async () => {
      const { error } = await supabase
        .from("rummy_current_game")
        .upsert(
          {
            id: CURRENT_GAME_ID,
            game_state: game,
            updated_at: new Date().toISOString()
          },
          { onConflict: "id" }
        );

      if (error) {
        setSyncStatus("offline");
        return;
      }

      setSyncStatus("synced");
    }, 300);

    return () => clearTimeout(timeout);
  }, [game]);



  const rounds = useMemo(() => activeRounds(game.rounds), [game.rounds]);
  const scoreTotals = useMemo(() => totals(game), [game]);
  const winner = game.winnerId ? game.players.find((player) => player.id === game.winnerId) : null;

  function createGame() {
    const players = DEFAULT_PLAYERS.slice(0, playerCount).map((player, index) => ({ ...player, name: names[index]?.trim() || player.name }));
    setGame({ gameId: crypto.randomUUID(), gameName: gameName.trim() || `Game ${new Date().toLocaleDateString()}`, players, targetScore: target === "custom" ? Number(customTarget || 1500) : target, starterId: players[0].id, rounds: [], status: "active", winnerId: null });
    setInputs({}); setClosedBy(null); setGameOpen(false); haptic([8, 18, 8]);
  }

  function toggleStarter() {
    setGame((previous: Game) => {
      const index = previous.players.findIndex((player) => player.id === previous.starterId);
      const next = previous.players[(index + 1) % previous.players.length] || previous.players[0];
      return { ...previous, starterId: next.id };
    });
  }

  function quick(playerId: string, amount: number) {
    setInputs((previous: Record<string, string>) => ({ ...previous, [playerId]: String((Number(previous[playerId] || 0) || 0) + amount) }));
    haptic(8);
  }
  function negative(playerId: string) {
    setInputs((previous: Record<string, string>) => {
      const value = String(previous[playerId] || "0");
      return { ...previous, [playerId]: value.startsWith("-") ? value.slice(1) : `-${value || "0"}` };
    });
  }
  function addPenalty(playerId: string) {
    setInputs((previous: Record<string, string>) => ({ ...previous, [playerId]: String((Number(previous[playerId] || 0) || 0) - 50) }));
    haptic([8, 18, 8]);
  }

  function addRound() {
    if (!game.gameId) { setGameOpen(true); return; }
    const scores: Record<string, number> = {};
    game.players.forEach((player) => { scores[player.id] = Number(String(inputs[player.id] || "0").replace(",", ".")) || 0; });
    const round: Round = { id: crypto.randomUUID(), scores, closedBy, starterId: game.starterId };
    setGame((previous: Game) => {
      const nextRounds = [...previous.rounds, round];
      const draft = { ...previous, rounds: nextRounds };
      const nextTotals = totals(draft);
      const winnerPlayer = previous.players.find((player) => (nextTotals[player.id] || 0) >= previous.targetScore);
      if (winnerPlayer) {
        const item: HistoryItem = { gameId: previous.gameId || crypto.randomUUID(), gameName: previous.gameName, winnerName: winnerPlayer.name, rounds: activeRounds(nextRounds).length, finishedAt: new Date().toISOString() };
        setHistory((old: HistoryItem[]) => [item, ...old].slice(0, 20));
        return { ...draft, status: "finished", winnerId: winnerPlayer.id };
      }
      return draft;
    });
    setInputs({}); setClosedBy(null); haptic([8, 18, 8]);
  }

  function undo() {
    setGame((previous: Game) => {
      const nextRounds = [...previous.rounds];
      for (let index = nextRounds.length - 1; index >= 0; index -= 1) {
        if (!nextRounds[index].deleted) { nextRounds[index] = { ...nextRounds[index], deleted: true }; break; }
      }
      return { ...previous, rounds: nextRounds, status: "active", winnerId: null };
    });
    haptic([10, 24, 10]);
  }

  function resetGame() { setGame((previous: Game) => ({ ...previous, rounds: [], status: "active", winnerId: null })); setInputs({}); setClosedBy(null); setSettingsOpen(false); }
  function rematch() { setGame((previous: Game) => ({ ...previous, gameId: crypto.randomUUID(), rounds: [], status: "active", winnerId: null })); setInputs({}); setClosedBy(null); }
  function newSetup() { setGame(createDefaultGame()); setInputs({}); setClosedBy(null); setGameOpen(true); }
  function saveGame() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(game)); localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {} setSettingsOpen(false); }

  return (
    <main className="app">
      <div className="bg" aria-hidden="true" />
      <div className="ui">
        <header className="header">
          <button type="button" onClick={toggleStarter} className="glass-soft pill">Starter: {game.players.find((player) => player.id === game.starterId)?.name || "You"}</button>
          <button type="button" onClick={() => setSettingsOpen(true)} className="glass-soft pill">{game.gameId ? `${game.gameName} · ${game.targetScore}` : "No game"}<span className={`sync-dot sync-${syncStatus}`} /></button>
        </header>

        <section className="glass scoreboard">
          <div className="label">Scoreboard</div>
          {game.players.map((player) => {
            const total = scoreTotals[player.id] || 0;
            const progress = Math.max(0, Math.min(100, Math.round((total / game.targetScore) * 100)));
            return (
              <div key={player.id} className="glass-soft player-card">
                <div className="ring" style={{ color: player.color }}>{progress}%</div>
                <div>
                  <div className="player-name">{player.name}</div>
                  <div className="progress"><div className="progress-fill" style={{ width: `${progress}%`, background: player.color }} /></div>
                </div>
                <div className="total">{total}</div>
              </div>
            );
          })}
        </section>

        
<section className="rounds">
  <div
    className="rounds-card glass"
    onClick={() => setShowRoundsPopup(true)}
    role="button"
  >
    {game.rounds.length === 0 ? (
      <div className="empty-rounds">
        <div className="empty-title">No rounds yet</div>
        <div className="empty-sub">Tap to view round history</div>
      </div>
    ) : (
      <div className="last-round">
        <div className="last-round-top">
          <div className="last-round-label">Last round</div>
          <div className="last-round-number">
            #{game.rounds.length}
          </div>
        </div>

        <div
          className="last-round-grid"
          style={{
            gridTemplateColumns: `repeat(${game.players.length}, minmax(0, 1fr))`,
          }}
        >
          {game.players.map((player) => {
            const value =
              game.rounds[game.rounds.length - 1]?.scores[player.id] ?? 0;

            return (
              <div key={player.id} className="last-round-player">
                <div
                  className="last-round-player-name"
                  style={{ color: player.color }}
                >
                  {player.name}
                </div>

                <div className="last-round-player-score">
                  {value > 0 ? "+" : ""}
                  {value}
                </div>
              </div>
            );
          })}
        </div>

        <div className="last-round-hint">
          Tap for full rounds overview
        </div>
      </div>
    )}
  </div>
</section>

      </div>

      <section className="dock">
        <div className="glass dock-panel">
          {game.players.map((player) => (
            <div key={player.id} className="input-row">
              <div className="input-main">
                <div className="input-name">{player.name}</div>
                <button type="button" onClick={() => negative(player.id)} className="icon-btn">−</button>
                <input value={inputs[player.id] || ""} onChange={(event) => setInputs((previous: Record<string, string>) => ({ ...previous, [player.id]: event.target.value }))} inputMode="decimal" placeholder="0" className="round-input" />
                <button type="button" onClick={() => setClosedBy(closedBy === player.id ? null : player.id)} className={`icon-btn ${closedBy === player.id ? "active" : ""}`}>✓</button>
              </div>
              <div className="quick-grid">{[5, 10, 25, 50].map((amount) => <button key={amount} type="button" onClick={() => quick(player.id, amount)} className="quick">+{amount}</button>)}</div>
            </div>
          ))}
          <div className="penalties" style={{ gridTemplateColumns: `repeat(${game.players.length}, minmax(0, 1fr))` }}>
            {game.players.map((player) => <button key={player.id} type="button" onClick={() => addPenalty(player.id)} className="penalty">-50 {player.name}</button>)}
          </div>
          <button type="button" onClick={addRound} className="glass-soft add-round">Add round</button>
        </div>
      </section>

      {settingsOpen && (
        <>
          <div className="modal-shade" onClick={() => setSettingsOpen(false)} />
          <section className="glass modal">
            <div className="modal-title">Settings</div>
            <div className="modal-grid">
              <button type="button" onClick={undo} className="glass-soft modal-btn">Undo</button>
              <button type="button" onClick={() => { setSettingsOpen(false); setGameOpen(true); }} className="glass-soft modal-btn">Game</button>
              <button type="button" onClick={saveGame} className="glass-soft modal-btn">Save</button>
              <button type="button" onClick={resetGame} className="glass-soft modal-btn">Reset</button>
            </div>
          </section>
        </>
      )}

      {gameOpen && (
        <>
          <div className="modal-shade" onClick={() => setGameOpen(false)} />
          <section className="glass sheet">
            <div className="modal-title">Game</div>
            <div className="form-grid">
              <input value={gameName} onChange={(event) => setGameName(event.target.value)} placeholder="Game name" className="form-input" />
              <div className="segment" style={{ "--count": 5 } as React.CSSProperties}>
                {[500, 1000, 1500, 2000, "custom"].map((value) => <button key={String(value)} type="button" onClick={() => setTarget(value as number | "custom")} className={target === value ? "selected" : ""}>{value === "custom" ? "Custom" : value}</button>)}
              </div>
              {target === "custom" && <input value={customTarget} onChange={(event) => setCustomTarget(event.target.value)} inputMode="numeric" placeholder="Custom target" className="form-input" />}
              <div className="segment" style={{ "--count": 3 } as React.CSSProperties}>
                {[2, 3, 4].map((count) => <button key={count} type="button" onClick={() => setPlayerCount(count)} className={playerCount === count ? "selected" : ""}>{count}</button>)}
              </div>
              {Array.from({ length: playerCount }, (_, index) => <input key={index} value={names[index] || ""} onChange={(event) => setNames((previous: string[]) => previous.map((name, nameIndex) => nameIndex === index ? event.target.value : name))} placeholder={DEFAULT_PLAYERS[index]?.name || `Player ${index + 1}`} className="form-input" />)}
              <button type="button" onClick={createGame} className="primary">Create game</button>
            </div>
            <div className="history">{history.slice(0, 5).map((item) => <div key={item.gameId} className="history-item"><strong>{item.gameName}</strong><span>{item.winnerName}</span></div>)}</div>
          </section>
        </>
      )}

      {game.status === "finished" && winner && (
        <>
          <div className="modal-shade" />
          <section className="glass modal">
            <div className="modal-title">Winner</div>
            <div style={{ textAlign: "center", fontSize: 42, fontWeight: 900, letterSpacing: "-.08em" }}>{winner.name}</div>
            <div className="modal-grid" style={{ marginTop: 16 }}>
              <button type="button" onClick={rematch} className="glass-soft modal-btn">Rematch</button>
              <button type="button" onClick={newSetup} className="glass-soft modal-btn">New game</button>
            </div>
          </section>
        </>
      )}
      {showRoundsPopup && (
        <>
          <div
            className="modal-shade"
            onClick={() => setShowRoundsPopup(false)}
          />

          <div className="sheet glass">
            <div className="modal-title rounds-popup-title">
              Rounds Overview
              
            </div>

            <div className="history">
              {game.rounds.length === 0 ? (
                <div className="history-item">
                  No rounds yet
                </div>
              ) : (
                game.rounds.map((round, index) => (
                  <div key={round.id} className="history-item">
                    <div>
                      <strong>Round {index + 1}</strong>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${game.players.length}, auto)`,
                        gap: "12px",
                      }}
                    >
                      {game.players.map((player) => (
                        <div key={player.id}>
                          <span style={{ color: player.color }}>
                            {player.name}
                          </span>
                          {" "}
                          {round.scores[player.id] > 0 ? "+" : ""}
                          {round.scores[player.id]}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

    </main>
  );
}
