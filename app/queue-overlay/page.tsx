"use client";

import { useCallback, useEffect, useState } from "react";

type QueueSong = {
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

type OverlayData = {
  success: boolean;
  queue: QueueSong[];
  activeCount: number;
  completedCount: number;
  pendingRequestCount: number;
};

export default function QueueOverlayPage() {
  const [data, setData] = useState<OverlayData | null>(null);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/queue-overlay", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error("overlay fetch failed");
      setData(result);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const songs = data?.queue ?? [];

  return (
    <main className="overlay-root min-h-screen w-full p-3 sm:p-4">
      <section className="mx-auto w-full max-w-[430px] overflow-hidden rounded-[22px] border border-[#e8d9cc] bg-[#fffaf5]/[0.97] text-[#3d3028] shadow-[0_12px_40px_rgba(35,24,16,0.20)]">
        <header className="border-b border-[#eee2d8] bg-gradient-to-r from-[#fffaf5] to-[#f5e9df] px-5 py-4">
          <p className="text-[10px] font-bold tracking-[0.24em] text-[#a18d7e]">SANGCHU PLAY QUEUE</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl">🎶</span>
            <h1 className="text-xl font-extrabold tracking-tight">오늘의 노래 Queue</h1>
          </div>
          <p className="mt-1 text-xs text-[#9a887b]">유상츄 노래 대기열</p>
          <div className="mt-3 flex gap-2">
            <div className="flex-1 rounded-xl border border-white/90 bg-white/80 px-3 py-2">
              <p className="text-[10px] font-semibold text-[#a18d7e]">대기</p>
              <p className="mt-0.5 text-lg font-extrabold tabular-nums">{data ? data.activeCount : "—"}<span className="ml-1 text-xs font-medium">곡</span></p>
            </div>
            <div className="flex-1 rounded-xl border border-white/90 bg-white/80 px-3 py-2">
              <p className="text-[10px] font-semibold text-[#a18d7e]">완료</p>
              <p className="mt-0.5 text-lg font-extrabold tabular-nums">{data ? data.completedCount : "—"}<span className="ml-1 text-xs font-medium">곡</span></p>
            </div>
          </div>
        </header>

        <div className="px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">대기 중인 노래</h2>
            <span className="rounded-full bg-[#f1e7de] px-2.5 py-1 text-[11px] font-bold text-[#8b6f5c]">{data ? `${data.activeCount}곡` : "불러오는 중"}</span>
          </div>

          {error ? (
            <div className="rounded-xl border border-[#eadfd5] bg-white/80 px-4 py-5 text-center text-xs text-[#9a887b]">Queue 정보를 불러오지 못했어요.</div>
          ) : !data ? (
            <div className="rounded-xl border border-[#eadfd5] bg-white/80 px-4 py-5 text-center text-xs text-[#9a887b]">Queue를 불러오는 중...</div>
          ) : songs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d9c6b7] bg-white/65 px-4 py-6 text-center">
              <p className="text-2xl">🎵</p>
              <p className="mt-2 text-sm font-bold">아직 대기 중인 노래가 없어요.</p>
              <p className="mt-1 text-xs text-[#9a887b]">다음 노래를 기다리는 중</p>
            </div>
          ) : (
            <div className="space-y-2">
              {songs.slice(0, 6).map((song, index) => (
                <div key={song.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-[#eee2d8] bg-white/90 px-3 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f1e7de] text-xs font-extrabold text-[#8b6f5c]">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{song.title}</p>
                    <p className="mt-0.5 truncate text-xs text-[#9a887b]">{song.artist}</p>
                  </div>
                  {song.category && <span className="shrink-0 rounded-full bg-[#f7f1ec] px-2 py-1 text-[10px] text-[#8b6f5c]">{song.category}</span>}
                </div>
              ))}
              {songs.length > 6 && <p className="pt-1 text-center text-[10px] text-[#9a887b]">외 {songs.length - 6}곡 더 대기 중</p>}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between rounded-xl border border-[#eadfd5] bg-[#f7f1ec] px-3 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎤</span>
              <div>
                <p className="text-xs font-bold">요청 대기 중</p>
                <p className="mt-0.5 text-[10px] text-[#9a887b]">승인 후 Queue에 추가됩니다.</p>
              </div>
            </div>
            <p className="text-lg font-extrabold tabular-nums">{data ? data.pendingRequestCount : "—"}<span className="ml-1 text-xs font-medium">곡</span></p>
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] text-[#a18d7e]">
            <span>{error ? "연결 확인 필요" : "자동으로 업데이트됩니다"}</span>
            <span>5초마다 갱신</span>
          </div>
        </div>
      </section>
      <style jsx global>{`
        html, body { background: transparent !important; margin: 0; padding: 0; }
        body { overflow: hidden; }
      `}</style>
    </main>
  );
}
