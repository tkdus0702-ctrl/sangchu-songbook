"use client";

import { useEffect, useState } from "react";

type QueueSong = {
  id: number | string;
  title: string;
  artist: string;
  song_key?: string | null;
  level?: string | null;
  category?: string | null;
  difficulty?: number | null;
};

type OverlayData = {
  success: boolean;
  queue: QueueSong[];
  activeCount: number;
  completedCount: number;
  pendingRequestCount: number;
};

export default function QueueOverlayPage() {
  const [data, setData] = useState<OverlayData>({
    success: false,
    queue: [],
    activeCount: 0,
    completedCount: 0,
    pendingRequestCount: 0,
  });
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch("/api/queue-overlay", { cache: "no-store" });
        const json = await response.json();
        if (alive && response.ok && json.success) {
          setData(json);
          setUpdated(true);
        }
      } catch (error) {
        console.error("Queue overlay refresh failed", error);
      }
    };
    load();
    const timer = window.setInterval(load, 5000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <main className="halloween-stage">
      <div className="night-sky" aria-hidden="true">
        <span className="moon" />
        <span className="bat bat-one">✦</span>
        <span className="bat bat-two">🦇</span>
        <span className="star star-one">✧</span>
        <span className="star star-two">✦</span>
        <span className="ghost ghost-one">☁</span>
      </div>

      <section className="queue-shell">
        <header className="brand-header">
          <div className="brand-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> SANGCHU PLAY QUEUE</div>
            <h1>유상츄 노래 대기열 <span className="tiny-sprout">♣</span></h1>
          </div>
          <div className="mascot-frame">
            <img src="/overlay/mojongi.png" alt="모종이 팬캐릭터" />
            <span className="witch-hat" aria-hidden="true">🎃</span>
          </div>
        </header>

        <div className="stats-row">
          <div className="stat-pill"><span>🎵</span><b>대기 {data.activeCount}곡</b></div>
          <div className="stat-pill"><span>🕯️</span><b>완료 {data.completedCount}곡</b></div>
          <div className="stat-pill request-pill"><span>🧡</span><b>요청 {data.pendingRequestCount}곡</b></div>
        </div>

        <section className="song-card">
          <div className="section-heading">
            <span className="heading-icon">♫</span>
            <div><h2>다음에 부를 노래</h2><p>THE LITTLE NIGHT QUEUE</p></div>
            <span className="pumpkin">🎃</span>
          </div>
          {data.queue.length === 0 ? (
            <div className="empty-state">
              <div className="empty-ghost">👻</div>
              <strong>아직 기다리는 노래가 없어요</strong>
              <span>오늘 밤의 첫 번째 노래를 기다리는 중!</span>
            </div>
          ) : (
            <ol className="song-list">
              {data.queue.slice(0, 6).map((song, index) => (
                <li key={song.id} className="song-row">
                  <span className="song-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="music-note">♪</span>
                  <div className="song-info">
                    <strong title={song.title}>{song.title}</strong>
                    <span title={song.artist}>{song.artist || "아티스트 미상"}</span>
                  </div>
                  {song.category ? <span className="song-tag">{song.category}</span> : null}
                  <span className="leaf-mark">✦</span>
                </li>
              ))}
            </ol>
          )}
          {data.queue.length > 6 && <div className="more-songs">그 외 {data.queue.length - 6}곡이 더 기다리고 있어요</div>}
        </section>

        <footer className="request-footer">
          <div className="footer-ghost">👻</div>
          <div className="footer-copy">
            <strong>노래책에서 노래신청!</strong>
            <span>요청 대기 <b>{data.pendingRequestCount}곡</b> · 승인 후 Queue에 추가돼요</span>
          </div>
          <div className="footer-pumpkin">🎃</div>
        </footer>
      </section>
      <style jsx global>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: transparent !important; overflow: hidden; }
        body { font-family: ui-rounded, "Arial Rounded MT Bold", "Noto Sans KR", system-ui, sans-serif; }
        .halloween-stage { width: 100%; min-height: 100vh; padding: 22px; position: relative; overflow: hidden; color: #43394e; background: radial-gradient(ellipse at 82% 4%, #6f5b91 0, #312a4d 40%, #211f37 100%); }
        .night-sky { position:absolute; inset:0; overflow:hidden; pointer-events:none; }
        .moon { position:absolute; right:25px; top:18px; width:125px; height:125px; border-radius:50%; background:#fff0bd; box-shadow:0 0 45px #ffe9a855, 0 0 100px #c6a9e622; }
        .bat,.star,.ghost { position:absolute; color:#f8dca1; opacity:.8; }
        .bat-one { top:55px; right:160px; font-size:35px; transform:rotate(-12deg); }
        .bat-two { top:125px; right:14px; font-size:24px; }
        .star-one { top:33px; left:20px; font-size:25px; }
        .star-two { top:190px; right:42px; font-size:18px; }
        .ghost-one { top:165px; right:180px; font-size:32px; color:#f3dff9; }
        .queue-shell { position:relative; z-index:1; width:100%; max-width:520px; margin:0 auto; padding:18px; border:2px solid #b7c68d; border-radius:30px; background:linear-gradient(145deg,rgba(255,249,234,.97),rgba(248,235,246,.97)); box-shadow:0 0 0 5px #4b405f, 0 15px 45px #09091666; }
        .brand-header { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:4px 4px 15px; }
        .brand-copy { min-width:0; }
        .eyebrow { display:flex; align-items:center; gap:7px; color:#7c6b8d; font-size:10px; letter-spacing:1.4px; font-weight:900; }
        .eyebrow-dot { width:7px; height:7px; border-radius:50%; background:#9dbd78; box-shadow:0 0 0 3px #dce6c4; }
        h1 { margin:6px 0 2px; color:#42553e; font-size:26px; line-height:1.15; letter-spacing:-1.1px; font-weight:1000; }
        .tiny-sprout { color:#789d64; font-size:22px; }
        .brand-copy p { margin:0; color:#8c7a8d; font-size:11px; font-weight:700; }
        .mascot-frame { width:90px; height:90px; flex:0 0 90px; border-radius:50%; overflow:hidden; border:3px solid #b5c78a; background:#e7e6bd; box-shadow:0 4px 0 #5a4b6c; position:relative; }
        .mascot-frame img { width:100%; height:100%; object-fit:cover; object-position:50% 48%; }
        .witch-hat { position:absolute; right:-2px; bottom:-2px; font-size:24px; filter:drop-shadow(0 2px 1px #59415f); }
        .stats-row { display:flex; gap:7px; margin:0 0 13px; }
        .stat-pill { flex:1; min-width:0; display:flex; align-items:center; justify-content:center; gap:5px; padding:9px 4px; border-radius:13px; background:#e9e9d0; border:1px solid #d3d8b2; color:#4d5144; font-size:11px; white-space:nowrap; }
        .stat-pill span { font-size:13px; }
        .request-pill { background:#f6e1e9; border-color:#e8c5d6; color:#72516c; }
        .song-card { overflow:hidden; border:2px solid #a9b87f; border-radius:22px; background:#fffaf1; box-shadow:inset 0 0 0 4px #f0e5dc; }
        .section-heading { display:flex; align-items:center; gap:10px; padding:15px 14px 12px; border-bottom:1px dashed #d8d2c6; }
        .heading-icon { display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:12px; background:#4b405f; color:#d5e6a7; font-size:24px; }
        .section-heading h2 { margin:0; font-size:16px; color:#4a4058; font-weight:950; }
        .section-heading p { margin:2px 0 0; font-size:8px; letter-spacing:1.5px; color:#a08ca0; font-weight:800; }
        .pumpkin { margin-left:auto; font-size:24px; }
        .empty-state { min-height:180px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; text-align:center; padding:20px; }
        .empty-ghost { font-size:44px; filter:drop-shadow(0 3px 0 #e2d4e6); }
        .empty-state strong { color:#544761; font-size:14px; }
        .empty-state span { color:#a08ca0; font-size:11px; }
        .song-list { list-style:none; padding:4px 12px 8px; margin:0; }
        .song-row { display:flex; align-items:center; gap:9px; min-height:58px; border-bottom:1px solid #eee5e0; }
        .song-row:last-child { border-bottom:0; }
        .song-number { flex:0 0 32px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:11px; background:#e8e9ce; color:#5b654d; font-weight:1000; font-size:12px; }
        .music-note { color:#879c69; font-size:19px; }
        .song-info { flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
        .song-info strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#4c4059; font-size:13px; }
        .song-info span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#9a899a; font-size:11px; }
        .song-tag { font-size:9px; border-radius:7px; background:#eee7f3; color:#766184; padding:4px 6px; }
        .leaf-mark { color:#b7c987; font-size:12px; }
        .more-songs { text-align:center; color:#8e7b90; font-size:10px; padding:0 10px 12px; }
        .request-footer { display:flex; align-items:center; gap:10px; margin-top:13px; padding:12px; border-radius:18px; background:#e7e9d0; border:1px solid #cbd5a7; }
        .footer-ghost { font-size:28px; }
        .footer-copy { flex:1; min-width:0; display:flex; flex-direction:column; gap:4px; }
        .footer-copy strong { color:#4c5a41; font-size:12px; }
        .footer-copy span { color:#7e7b6a; font-size:10px; line-height:1.4; }
        .footer-copy b { color:#7a5a7c; }
        .footer-pumpkin { font-size:25px; }
        .update-line { display:flex; justify-content:center; align-items:center; gap:6px; padding-top:12px; color:#a79aa8; font-size:9px; font-weight:700; }
        .live-dot { width:6px; height:6px; background:#91b77a; border-radius:50%; box-shadow:0 0 0 3px #dce8c9; }
        .live-dot.offline { background:#c7a5a5; box-shadow:0 0 0 3px #f1dede; }
        @media (max-width:390px) { .halloween-stage { padding:12px; } .queue-shell { padding:12px; border-radius:24px; } h1 { font-size:22px; } .mascot-frame { width:74px;height:74px;flex-basis:74px; } .stat-pill { font-size:10px; } }
      `}</style>
    </main>
  );
}
