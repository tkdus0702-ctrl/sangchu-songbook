"use client";

import { useCallback, useEffect, useState } from "react";

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

export default function SongRequestPanel({ isAdmin }: { isAdmin: boolean }) {
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAdmin) {
      setRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/song-requests", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setLoadError(
          result.message || result.error ||
          `요청 목록 조회 실패 (HTTP ${response.status})`
        );
        return;
      }
      if (!Array.isArray(result.requests)) {
        setLoadError("서버 응답에 요청 목록이 없습니다. API 응답을 확인해주세요.");
        return;
      }
      setRequests(result.requests);
      setLoadError(null);
    } catch (error) {
      console.error("요청 목록 조회 오류:", error);
      setLoadError("요청 목록을 불러오지 못했습니다. 인터넷 연결을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void refresh();
    if (!isAdmin) return;

    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [refresh, isAdmin]);

  const processRequest = async (item: SongRequest, action: "add" | "reject") => {
    if (busyId !== null) return;
    setBusyId(item.id);

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
        await refresh();
        return;
      }

      await refresh();
    } catch (error) {
      console.error(error);
      alert("요청 처리 중 오류가 발생했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  if (!isAdmin) return null;

  return (
    <section className="mt-5 rounded-xl border border-[#eadfd5] bg-white p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xl">🎤</span>
            <h3 className="text-base font-bold text-[#3d3028]">요청 대기 중</h3>
            <span className="rounded-full bg-[#f1e7de] px-2.5 py-1 text-xs font-bold text-[#8b6f5c]">
              {loadError ? "확인 실패" : `${requests.length}곡`}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#9a887b]">승인하면 오늘의 노래 Queue에 추가됩니다.</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="shrink-0 rounded-lg border border-[#eadfd5] px-3 py-2 text-xs font-medium text-[#8b6f5c] transition hover:bg-[#fffaf5] disabled:opacity-50"
        >
          {loading ? "확인 중…" : "새로고침"}
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {loadError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            <p className="font-semibold">요청 목록을 불러오지 못했어요.</p>
            <p className="mt-1 break-words">{loadError}</p>
            <button type="button" onClick={() => void refresh()} className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold">다시 시도</button>
          </div>
        ) : loading ? (
          <p className="py-5 text-center text-sm text-[#9a887b]">요청을 불러오는 중...</p>
        ) : requests.length === 0 ? (
          <p className="rounded-xl bg-[#fffaf5] px-4 py-6 text-center text-sm text-[#9a887b]">현재 대기 중인 노래 요청이 없어요.</p>
        ) : (
          requests.map((item) => (
            <div key={item.id} className="rounded-xl border border-[#eadfd5] bg-[#fffaf5] p-3">
              <div className="min-w-0">
                <p className="font-semibold text-[#3d3028]">{item.title}</p>
                <p className="mt-1 text-sm text-[#8b6f5c]">
                  {item.artist}{item.category ? ` · ${item.category}` : ""}{item.level ? ` · ${item.level}` : ""}{item.difficulty ? ` · 난이도 ${item.difficulty}` : ""}
                </p>
                <p className="mt-1 text-xs text-[#a18d7e]">{new Date(item.created_at).toLocaleString("ko-KR")}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" disabled={busyId !== null} onClick={() => void processRequest(item, "add")} className="flex-1 rounded-lg bg-[#8b6f5c] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#725846] disabled:cursor-not-allowed disabled:opacity-50">
                  {busyId === item.id ? "처리 중…" : "승인 · Queue 추가"}
                </button>
                <button type="button" disabled={busyId !== null} onClick={() => void processRequest(item, "reject")} className="rounded-lg border border-[#e5d7cb] bg-white px-3 py-2 text-xs font-medium text-[#9a887b] transition hover:bg-[#f8eee7] disabled:cursor-not-allowed disabled:opacity-50">거절</button>
              </div>
            </div>
          ))
        )}
      </div>
      <p className="mt-3 text-right text-xs text-[#a18d7e]">10초마다 자동 갱신</p>
    </section>
  );
}
