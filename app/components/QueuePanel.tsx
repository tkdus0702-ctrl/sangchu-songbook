
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

type SongRequest = {
  id: number;
  song_id: string;
  title: string;
  artist: string;
  song_key: string | null;
  level: string | null;
  category: string | null;
  difficulty: number | null;
  created_at: string;
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

  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [busyRequestId, setBusyRequestId] = useState<number | null>(null);
  const [requestLoadError, setRequestLoadError] = useState<string | null>(null);

  const refreshRequests = useCallback(async () => {
    if (!isAdmin) {
      setRequests([]);
      setRequestsLoading(false);
      return;
    }

    setRequestsLoading(true);
    try {
      const response = await fetch("/api/song-requests", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setRequestLoadError(
          result.message || result.error ||
          `요청 목록 조회 실패 (HTTP ${response.status})`
        );
        return;
      }

      if (!Array.isArray(result.requests)) {
        setRequestLoadError("서버 응답에 요청 목록이 없습니다. API 응답을 확인해주세요.");
        return;
      }

      setRequests(result.requests);
      setRequestLoadError(null);
    } catch (error) {
      console.error("요청 목록 조회 오류:", error);
      setRequestLoadError("요청 목록을 불러오지 못했습니다. 인터넷 연결을 확인해주세요.");
    } finally {
      setRequestsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void refreshRequests();
    if (!isAdmin) return;

    const timer = window.setInterval(() => void refreshRequests(), 10000);
    return () => window.clearInterval(timer);
  }, [refreshRequests, isAdmin]);

  const processRequest = async (
    item: SongRequest,
    action: "add" | "reject"
  ) => {
    if (busyRequestId !== null) return;
    setBusyRequestId(item.id);

    try {
      if (action === "add") {
        const queueResponse = await fetch("/api/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            song_id: item.song_id,
            title: item.title,
            artist: item.artist,
            key: item.song_key,
            level: item.level,
            category: item.category,
            difficulty: item.difficulty,
          }),
        });

        if (!queueResponse.ok && queueResponse.status !== 409) {
          const result = await queueResponse.json().catch(() => ({}));
          alert(result.message || result.error || "Queue 추가에 실패했습니다.");
          return;
        }

        window.dispatchEvent(new Event("queue-refresh"));
      }

      const response = await fetch("/api/song-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          status: action === "add" ? "added" : "rejected",
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        alert(result.message || "요청 처리에 실패했습니다.");
        await refreshRequests();
        return;
      }

      await refreshRequests();
    } catch (error) {
      console.error(error);
      alert("요청 처리 중 오류가 발생했습니다.");
    } finally {
      setBusyRequestId(null);
    }
  };


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
          ? "border-[#d9e9de] bg-[#edf6f0] opacity-75"
          : "border-[#d9e9de] bg-white")
      }
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e3efe7] text-sm font-bold text-[#5b9877]">
          {item.completed ? "✓" : index + 1}
        </span>

        <div className="min-w-0">
          <p
            className={
              "break-words font-semibold " +
              (item.completed ? "text-[#718f7e] line-through" : "")
            }
          >
            {item.title}
          </p>
          <p className="mt-0.5 break-words text-sm text-[#718f7e]">
            {item.artist}
          </p>

          <div className="mt-1 flex flex-wrap gap-1.5">
            {item.category && (
              <span className="rounded-full bg-[#e3efe7] px-2 py-0.5 text-xs text-[#5b9877]">
                {item.category}
              </span>
            )}
            {item.level && (
              <span className="rounded-full bg-[#edf6f0] px-2 py-0.5 text-xs text-[#5b9877]">
                {item.level}
              </span>
            )}
            {item.difficulty && (
              <span className="text-xs">
                {"⭐".repeat(item.difficulty)}
              </span>
            )}
            {item.completed && (
              <span className="text-xs font-medium text-[#5b9877]">
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
                className="rounded-lg border border-[#d9e9de] px-3 py-2 text-sm text-[#5b9877] hover:bg-[#edf6f0] disabled:opacity-30"
                aria-label="위로 이동"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={busy || index === activeQueue.length - 1}
                onClick={() => moveSong(item, 1)}
                className="rounded-lg border border-[#d9e9de] px-3 py-2 text-sm text-[#5b9877] hover:bg-[#edf6f0] disabled:opacity-30"
                aria-label="아래로 이동"
              >
                ↓
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => updateItem(item.id, "complete")}
                className="rounded-lg bg-[#5b9877] px-3 py-2 text-sm text-white hover:bg-[#3e7558] disabled:opacity-50"
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
              className="rounded-lg border border-[#d9e9de] px-3 py-2 text-sm text-[#5b9877] disabled:opacity-50"
            >
              다시 대기
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => deleteItem(item)}
            className="rounded-lg border border-[#d9e9de] px-3 py-2 text-sm text-[#7965b4] hover:bg-[#f0ebfb] disabled:opacity-50"
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
    className="fixed bottom-4 right-4 z-50 flex max-h-[70dvh] w-[calc(100vw-2rem)] max-w-[420px] flex-col overflow-hidden rounded-2xl border border-[#d9e9de] bg-[#f3faf5] p-4 shadow-2xl sm:bottom-6 sm:right-6 sm:max-h-[75dvh] sm:p-5"
  >
    {/* 제목 영역: 항상 표시 */}
    <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-[#789786]">
          SANGCHU PLAY QUEUE
        </p>
<h2 className="mt-1 flex items-center gap-2 text-xl font-bold text-[#789d64]">
  유상츄 노래 대기열
  <img
    src="/overlay/title.svg"
    alt="로고"
    width={28}
    height={28}
    className="queue-title-logo"
  />
</h2>
      </div>

      <div className="flex gap-2">
        <span className="rounded-full bg-white px-3 py-1.5 text-sm text-[#5b9877]">
          대기 {activeQueue.length}곡
        </span>
        <span className="rounded-full bg-white px-3 py-1.5 text-sm text-[#718f7e]">
          완료 {completedQueue.length}곡
        </span>
      </div>
    </div>

    {/* 이 영역만 스크롤 */}
    <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
      {isAdmin && (
        <div className="rounded-xl border border-[#d9e9de] bg-white p-3">
          <p className="mb-2 text-sm font-semibold text-[#496d56]">
            관리자 Queue 관리
          </p>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={addRandomSong}
              disabled={busy || songs.length === 0}
              className="rounded-xl border border-[#c2d9c9] bg-[#edf6f0] px-4 py-3 text-sm font-semibold text-[#5b9877] hover:bg-[#e3efe7] disabled:opacity-50"
            >
              🎲 랜덤 추가
            </button>

            <button
              type="button"
              onClick={clearQueue}
              disabled={busy || queue.length === 0}
              className="rounded-xl border border-[#d6c9f0] bg-[#f0ebfb] px-4 py-3 text-sm font-semibold text-[#7965b4] hover:bg-[#e8e0fa] disabled:opacity-40"
            >
              🗑️ Queue 전체 초기화
            </button>
          </div>
        </div>
      )}

      {/* 대기 중인 노래 */}
      <div className="mt-4">
        <h3 className="mb-3 font-semibold text-[#496d56]">
          대기 중인 노래
        </h3>

        {loading ? (
          <p className="py-6 text-center text-sm text-[#718f7e]">
            Queue를 불러오는 중...
          </p>
        ) : activeQueue.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#c2d9c9] bg-white px-4 py-8 text-center">
            <p className="text-2xl">🎵</p>
            <p className="mt-2 font-medium text-[#496d56]">
              아직 대기 중인 노래가 없어요.
            </p>
            {isAdmin && (
              <p className="mt-1 text-sm text-[#718f7e]">
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

      {/* 완료된 노래 */}
      {completedQueue.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowCompleted((value) => !value)}
            className="flex w-full items-center justify-between rounded-xl border border-[#d9e9de] bg-white px-4 py-3 text-sm font-semibold text-[#5b9877]"
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
{/* 요청 대기 목록: Queue와 같은 패널 안에 표시 */}
      {isAdmin && (
        <div className="mt-5 border-t border-[#d9e9de] pt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xl">🎤</span>
                <h3 className="text-base font-bold text-[#263c32]">요청 대기 중</h3>
                <span className="rounded-full bg-[#e3efe7] px-2.5 py-1 text-xs font-bold text-[#5b9877]">
                  {requestLoadError ? "확인 실패" : `${requests.length}곡`}
                </span>
              </div>
              <p className="mt-1 text-sm text-[#718f7e]">승인하면 오늘의 노래 Queue에 추가됩니다.</p>
            </div>
            <button
              type="button"
              onClick={() => void refreshRequests()}
              disabled={requestsLoading}
              className="shrink-0 rounded-lg border border-[#d9e9de] px-3 py-2 text-xs font-medium text-[#5b9877] transition hover:bg-[#f3faf5] disabled:opacity-50"
            >
              {requestsLoading ? "확인 중…" : "새로고침"}
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {requestLoadError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                <p className="font-semibold">요청 목록을 불러오지 못했어요.</p>
                <p className="mt-1 break-words">{requestLoadError}</p>
                <button
                  type="button"
                  onClick={() => void refreshRequests()}
                  className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold"
                >
                  다시 시도
                </button>
              </div>
            ) : requestsLoading ? (
              <p className="py-5 text-center text-sm text-[#718f7e]">요청을 불러오는 중...</p>
            ) : requests.length === 0 ? (
              <p className="rounded-xl bg-[#f3faf5] px-4 py-6 text-center text-sm text-[#718f7e]">
                현재 대기 중인 노래 요청이 없어요.
              </p>
            ) : (
              requests.map((item) => (
                <div key={item.id} className="rounded-xl border border-[#d9e9de] bg-[#f3faf5] p-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#263c32]">{item.title}</p>
                    <p className="mt-1 text-sm text-[#5b9877]">
                      {item.artist}
                      {item.category ? ` · ${item.category}` : ""}
                      {item.level ? ` · ${item.level}` : ""}
                      {item.difficulty ? ` · 난이도 ${item.difficulty}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-[#789786]">
                      {new Date(item.created_at).toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={busyRequestId !== null}
                      onClick={() => void processRequest(item, "add")}
                      className="flex-1 rounded-lg bg-[#5b9877] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#3e7558] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyRequestId === item.id ? "처리 중…" : "승인 · Queue 추가"}
                    </button>
                    <button
                      type="button"
                      disabled={busyRequestId !== null}
                      onClick={() => void processRequest(item, "reject")}
                      className="rounded-lg border border-[#d6c9f0] bg-white px-3 py-2 text-xs font-medium text-[#7965b4] transition hover:bg-[#f0ebfb] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      거절
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <p className="mt-3 text-right text-xs text-[#789786]">10초마다 자동 갱신</p>
        </div>
      )}
      
      {isAdmin && busy && (
        <p className="mt-3 text-right text-xs text-[#718f7e]">
          변경사항을 처리하고 있어요...
        </p>
      )}
    </div>
  </section>
);

}
