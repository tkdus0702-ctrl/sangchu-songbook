
"use client";

import { useCallback, useEffect, useState } from "react";

type Song = {
  id: string | number;
  title: string;
  artist: string;
  key?: string | null;
  level?: string | null;
  category?: string | null;
  difficulty?: number | null;
};

type QueueItem = {
  id: number;
  song_id: string;
  title: string;
  artist: string;
  song_key: string | null;
  level: string | null;
  category: string | null;
  difficulty: number | null;
  position: number;
  completed: boolean;
};

type Props = {
  songs: Song[];
  isAdmin: boolean;
};

export default function QueuePanel({ songs, isAdmin }: Props) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedSongId, setSelectedSongId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const refreshQueue = useCallback(async () => {
    try {
      const response = await fetch("/api/queue", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Queue를 불러오지 못했습니다.");
      }

      setQueue(result.queue || []);
    } catch (error) {
      console.error("Queue 조회 오류:", error);
    } finally {
      setLoading(false);
    }
  }, []);


useEffect(() => {
  // 처음 화면에 들어올 때 Queue 조회
  refreshQueue();

  // 같은 페이지에서 Queue 변경 이벤트가 발생하면 즉시 갱신
  const handleQueueRefresh = () => {
    refreshQueue();
  };

  window.addEventListener("queue-refresh", handleQueueRefresh);

  // 다른 브라우저나 방문자의 변경사항도 자동으로 반영
  const intervalId = window.setInterval(() => {
    refreshQueue();
  }, 5000);

  return () => {
    window.removeEventListener("queue-refresh", handleQueueRefresh);
    window.clearInterval(intervalId);
  };
}, [refreshQueue]);

  const activeQueue = queue.filter((item) => !item.completed);
  const completedQueue = queue.filter((item) => item.completed);

  const addSong = async (song: Song) => {
    if (!isAdmin || busy) return;

    setBusy(true);

    try {
      const response = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          song_id: song.id,
          title: song.title,
          artist: song.artist,
          key: song.key,
          level: song.level,
          category: song.category,
          difficulty: song.difficulty,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.message || "Queue 추가에 실패했습니다.");
        return;
      }

      await refreshQueue();
      setSelectedSongId("");
    } catch (error) {
      console.error(error);
      alert("Queue 추가 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const addSelectedSong = async () => {
    const song = songs.find(
      (item) => String(item.id) === selectedSongId
    );

    if (!song) {
      alert("추가할 노래를 선택해주세요.");
      return;
    }

    await addSong(song);
  };

  const addRandomSong = async () => {
    if (!isAdmin || busy) return;

    const activeSongIds = new Set(
      activeQueue.map((item) => item.song_id)
    );

    const candidates = songs.filter(
      (song) => !activeSongIds.has(String(song.id))
    );

    if (candidates.length === 0) {
      alert("랜덤으로 추가할 노래가 없습니다.");
      return;
    }

    const randomSong =
      candidates[Math.floor(Math.random() * candidates.length)];

    await addSong(randomSong);
  };

  const updateItem = async (
    id: number,
    action: "complete" | "reopen"
  ) => {
    if (!isAdmin || busy) return;

    setBusy(true);

    try {
      const response = await fetch("/api/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.message || "Queue 변경에 실패했습니다.");
        return;
      }

      await refreshQueue();
    } catch (error) {
      console.error(error);
      alert("Queue 변경 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const moveSong = async (item: QueueItem, direction: -1 | 1) => {
    if (!isAdmin || busy) return;

    const index = activeQueue.findIndex(
      (entry) => entry.id === item.id
    );
    const target = activeQueue[index + direction];

    if (!target) return;

    setBusy(true);

    try {
      const firstResponse = await fetch("/api/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          action: "move",
          position: target.position,
        }),
      });

      const firstResult = await firstResponse.json();

      if (!firstResponse.ok || !firstResult.success) {
        throw new Error(firstResult.message || "순서 변경 실패");
      }

      const secondResponse = await fetch("/api/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: target.id,
          action: "move",
          position: item.position,
        }),
      });

      const secondResult = await secondResponse.json();

      if (!secondResponse.ok || !secondResult.success) {
        throw new Error(secondResult.message || "순서 변경 실패");
      }

      await refreshQueue();
    } catch (error) {
      console.error(error);
      alert("순서 변경에 실패했습니다. Queue를 새로고침합니다.");
      await refreshQueue();
    } finally {
      setBusy(false);
    }
  };

  const deleteItem = async (item: QueueItem) => {
    if (!isAdmin || busy) return;

    if (!confirm(`"${item.title}"을(를) Queue에서 삭제할까요?`)) {
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(
        `/api/queue?id=${encodeURIComponent(String(item.id))}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.message || "삭제에 실패했습니다.");
        return;
      }

      await refreshQueue();
    } catch (error) {
      console.error(error);
      alert("Queue 삭제 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  // 대기 중인 노래와 완료된 노래를 모두 삭제합니다.
  const clearQueue = async () => {
    if (!isAdmin || busy || queue.length === 0) return;

    const confirmed = confirm(
      `Queue에 있는 노래 ${queue.length}곡을 모두 삭제할까요?\n\n` +
      "대기 중인 노래와 완료된 노래가 모두 삭제됩니다.\n" +
      "노래책 원본 목록은 삭제되지 않습니다.\n\n" +
      "이 작업은 되돌릴 수 없습니다."
    );

    if (!confirmed) return;

    setBusy(true);

    try {
      const response = await fetch("/api/queue?all=true", {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.message || "Queue 전체 초기화에 실패했습니다.");
        return;
      }

      setShowCompleted(false);
      await refreshQueue();
      alert("Queue를 전체 초기화했습니다.");
    } catch (error) {
      console.error(error);
      alert("Queue 전체 초기화 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const renderItem = (item: QueueItem, index: number) => (
    <div
      key={item.id}
      className={
        "flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between " +
        (item.completed
          ? "border-[#eee5de] bg-[#faf7f4] opacity-75"
          : "border-[#eadfd5] bg-white")
      }
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f1e7de] text-sm font-bold text-[#8b6f5c]">
          {item.completed ? "✓" : index + 1}
        </span>

        <div className="min-w-0">
          <p
            className={
              "break-words font-semibold " +
              (item.completed ? "text-[#9a887b] line-through" : "")
            }
          >
            {item.title}
          </p>
          <p className="mt-0.5 break-words text-sm text-[#9a887b]">
            {item.artist}
          </p>

          <div className="mt-1 flex flex-wrap gap-1.5">
            {item.category && (
              <span className="rounded-full bg-[#f1e7de] px-2 py-0.5 text-xs text-[#8b6f5c]">
                {item.category}
              </span>
            )}
            {item.level && (
              <span className="rounded-full bg-[#f7f1ec] px-2 py-0.5 text-xs text-[#8b6f5c]">
                {item.level}
              </span>
            )}
            {item.difficulty && (
              <span className="text-xs">
                {"⭐".repeat(item.difficulty)}
              </span>
            )}
            {item.completed && (
              <span className="text-xs font-medium text-[#8b6f5c]">
                완료
              </span>
            )}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {!item.completed && (
            <>
              <button
                type="button"
                disabled={busy || index === 0}
                onClick={() => moveSong(item, -1)}
                className="rounded-lg border border-[#eadfd5] px-3 py-2 text-sm text-[#8b6f5c] hover:bg-[#f7f1ec] disabled:opacity-30"
                aria-label="위로 이동"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={busy || index === activeQueue.length - 1}
                onClick={() => moveSong(item, 1)}
                className="rounded-lg border border-[#eadfd5] px-3 py-2 text-sm text-[#8b6f5c] hover:bg-[#f7f1ec] disabled:opacity-30"
                aria-label="아래로 이동"
              >
                ↓
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => updateItem(item.id, "complete")}
                className="rounded-lg bg-[#8b6f5c] px-3 py-2 text-sm text-white hover:bg-[#725846] disabled:opacity-50"
              >
                완료
              </button>
            </>
          )}

          {item.completed && (
            <button
              type="button"
              disabled={busy}
              onClick={() => updateItem(item.id, "reopen")}
              className="rounded-lg border border-[#eadfd5] px-3 py-2 text-sm text-[#8b6f5c] disabled:opacity-50"
            >
              다시 대기
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => deleteItem(item)}
            className="rounded-lg border border-[#eadfd5] px-3 py-2 text-sm text-[#a66b5b] hover:bg-[#fff1ed] disabled:opacity-50"
          >
            삭제
          </button>
        </div>
      )}
    </div>
  );

  return (
    <section
      id="song-queue"
      className="mb-8 scroll-mt-6 rounded-2xl border border-[#eadfd5] bg-[#fcf7f2] p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#a18d7e]">
            SANGCHU PLAY QUEUE
          </p>
          <h2 className="mt-1 text-xl font-bold text-[#3d3028]">
            🎶 오늘의 노래 Queue
          </h2>
          <p className="mt-1 text-sm text-[#9a887b]">
            유샹츄 노래 대기열
          </p>
        </div>

        <div className="flex gap-2">
          <span className="rounded-full bg-white px-3 py-1.5 text-sm text-[#8b6f5c]">
            대기 {activeQueue.length}곡
          </span>
          <span className="rounded-full bg-white px-3 py-1.5 text-sm text-[#9a887b]">
            완료 {completedQueue.length}곡
          </span>
        </div>
      </div>

      {isAdmin && (
        <div className="mt-5 rounded-xl border border-[#eadfd5] bg-white p-3">
          <p className="mb-2 text-sm font-semibold text-[#6f5d50]">
            관리자 Queue 관리
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={addRandomSong}
              disabled={busy || songs.length === 0}
              className="rounded-xl border border-[#d9c6b7] bg-[#f7f1ec] px-4 py-3 text-sm font-semibold text-[#8b6f5c] hover:bg-[#efe3d9] disabled:opacity-50"
            >
              🎲 랜덤 추가
            </button>

            <button
              type="button"
              onClick={clearQueue}
              disabled={busy || queue.length === 0}
              className="rounded-xl border border-[#e4bdb4] bg-[#fff1ed] px-4 py-3 text-sm font-semibold text-[#a65f50] hover:bg-[#ffe5de] disabled:opacity-40"
            >
              🗑️ Queue 전체 초기화
            </button>
          </div>
        </div>
      )}

      <div className="mt-5">
        <h3 className="mb-3 font-semibold text-[#6f5d50]">
          대기 중인 노래
        </h3>

        {loading ? (
          <p className="py-6 text-center text-sm text-[#9a887b]">
            Queue를 불러오는 중...
          </p>
        ) : activeQueue.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d9c6b7] bg-white/70 px-4 py-8 text-center">
            <p className="text-2xl">🎵</p>
            <p className="mt-2 font-medium text-[#6f5d50]">
              아직 대기 중인 노래가 없어요.
            </p>
            {isAdmin && (
              <p className="mt-1 text-sm text-[#9a887b]">
                위에서 노래를 추가해 주세요.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {activeQueue.map((item, index) => renderItem(item, index))}
          </div>
        )}
      </div>

      {completedQueue.length > 0 && (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setShowCompleted((value) => !value)}
            className="flex w-full items-center justify-between rounded-xl border border-[#eadfd5] bg-white px-4 py-3 text-sm font-semibold text-[#8b6f5c]"
          >
            <span>완료된 노래 {completedQueue.length}곡</span>
            <span>{showCompleted ? "접기 ▲" : "펼치기 ▼"}</span>
          </button>

          {showCompleted && (
            <div className="mt-2 space-y-2">
              {completedQueue.map((item, index) =>
                renderItem(item, index)
              )}
            </div>
          )}
        </div>
      )}


      {isAdmin && busy && (
        <p className="mt-2 text-right text-xs text-[#9a887b]">
          변경사항을 처리하고 있어요...
        </p>
      )}
    </section>
  );
}
