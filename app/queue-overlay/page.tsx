
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

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const response = await fetch("/api/queue-overlay", {
          cache: "no-store",
        });
        const json = await response.json();

        if (alive && response.ok && json.success) {
          setData(json);
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
    <main className="overlay-stage">

      <section className="queue-panel" aria-label="유상츄 노래 Queue">
        <header className="brand-header">
          <div className="brand-copy">
            <div className="eyebrow">
              <span className="live-dot" />
              SANGCHU PLAY QUEUE
            </div>

<h1 className="queue-title">
  <span className="queue-title-text">유상츄 노래 대기열</span>
<img
  src="/overlay/title.svg"
  alt="로고"
  width={28}
  height={28}
  className="queue-title-logo"
/>
</h1>
          </div>

        <div className="mascot-frame">
<div className="mascot-frame">
  <img
    src="/overlay/sangchu2.png"
    alt="유상츄"
    width={120}
    height={150}
  />
</div>
</div>
        </header>

        <div className="stats-row" aria-label="Queue 통계">
          <div className="stat-pill">
            <span>♫</span>
            <b>대기 {data.activeCount}곡</b>
          </div>

          <div className="stat-pill">
            <span>✔</span>
            <b>완료 {data.completedCount}곡</b>
          </div>

          <div className="stat-pill request-pill">
            <span>♪</span>
            <b>요청 {data.pendingRequestCount}곡</b>
          </div>
        </div>

        <section className="song-card">
          <div className="section-heading">
            <span className="heading-icon">♫</span>

            <div>
              <h2>다음에 부를 노래</h2>
              <p>UP NEXT</p>
            </div>

            <span className="heading-star" aria-hidden="true">
              
            </span>
          </div>

          {data.queue.length === 0 ? (
            <div className="empty-state">
              <div className="empty-note" aria-hidden="true">
                ♫
              </div>

              <strong>아직 대기 중인 노래가 없어요</strong>
              <span>새로운 노래를 기다리는 중이에요.</span>
            </div>
          ) : (
            <ol className="song-list">
              {data.queue.slice(0, 5).map((song, index) => (
                <li key={song.id} className="song-row">
                  <span className="song-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="song-info">
                    <strong title={song.title}>{song.title}</strong>
                    <span title={song.artist}>
                      {song.artist || "아티스트 미상"}
                    </span>
                  </div>

                  {song.category ? (
                    <span className="song-tag">{song.category}</span>
                  ) : null}

                  <span className="row-note" aria-hidden="true">
                    ♪
                  </span>
                </li>
              ))}
            </ol>
          )}

          {data.queue.length > 5 && (
            <div className="more-songs">
              + {data.queue.length - 5}곡 더 대기 중
            </div>
          )}
        </section>

        <footer className="request-footer">
          <span className="footer-note" aria-hidden="true">
            ♫
          </span>

          <div className="footer-copy">
            <strong>노래책에서 노래신청!</strong>
            <span>
              요청 <b>{data.pendingRequestCount}곡</b> · 승인 후 Queue에
              추가돼요
            </span>
          </div>

          <span className="footer-star" aria-hidden="true">
            
          </span>
        </footer>
      </section>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          background: transparent !important;
        }

        body {
          overflow: hidden;
        }

        .overlay-stage {
          --ink: #fffdf8;
          --muted: rgba(255, 255, 255, 0.76);
          --mint: #c7f0d6;
          --lavender: #e2d6ff;
          --gold: #ffe7a6;

          position: relative;
          width: 100%;
          min-height: 100vh;
          padding: 18px;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          overflow: hidden;
          background: transparent !important;
          color: var(--ink);
          font-family:
            Pretendard, "Noto Sans KR", -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
        }

        .queue-panel {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 520px;
          padding: 8px 22px 22px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.32);
          border-radius: 26px;
          background: rgba(31, 43, 43, 0.48);
          box-shadow:
            0 12px 40px rgba(0, 0, 0, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .brand-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 0px;
        }

        .brand-copy {
          min-width: 0;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 8px;
          color: var(--mint);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .live-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          flex-shrink: 0;
          border-radius: 50%;
          background: #a8f4c2;
          box-shadow: 0 0 10px rgba(168, 244, 194, 0.7);
        }

.brand-header h1.queue-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: #ffffff;
  font-size: 30px;
  font-weight: 850;
  letter-spacing: -1.1px;
  line-height: 1.35;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
}

.brand-header h1.queue-title .queue-title-text {
  color: #ffffff;
  font-size: inherit;
  font-weight: inherit;
  white-space: nowrap;
}

.brand-header h1.queue-title .queue-title-logo {
  display: block;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  object-fit: contain;
}

.mascot-frame {
  width: 120px;
  height: 150px;
  flex-shrink: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  overflow: visible;
}

.mascot-frame img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: bottom center;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;

  transform: translateY(-65px);
}

        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 15px;
        }

        .stat-pill {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-width: 0;
          padding: 11px 6px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.12);
          color: #fffdf8;
          font-size: 12px;
          white-space: nowrap;
        }

        .stat-pill > span {
          color: var(--mint);
          font-size: 14px;
        }

        .stat-pill b {
          font-weight: 750;
        }

        .request-pill > span {
          color: var(--gold);
        }

        .song-card {
          padding: 17px;
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 20px;
          background: rgba(15, 24, 25, 0.32);
        }

        .section-heading {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 14px;
        }

        .heading-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 39px;
          height: 39px;
          flex-shrink: 0;
          border: 1px solid rgba(199, 240, 214, 0.38);
          border-radius: 13px;
          background: rgba(199, 240, 214, 0.15);
          color: var(--mint);
          font-size: 21px;
        }

        .section-heading h2 {
          margin: 0 0 3px;
          color: #fffdf8;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .section-heading p {
          margin: 0;
          color: rgba(255, 255, 255, 0.62);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .heading-star {
          margin-left: auto;
          color: var(--lavender);
          font-size: 23px;
        }

        .song-list {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .song-row {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
          padding: 11px 12px;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.09);
        }

        .song-number {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          border: 1px solid rgba(199, 240, 214, 0.25);
          border-radius: 10px;
          background: rgba(199, 240, 214, 0.13);
          color: var(--mint);
          font-size: 12px;
          font-weight: 850;
          font-variant-numeric: tabular-nums;
        }

        .song-info {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .song-info strong {
          overflow: hidden;
          color: #fffdf8;
          font-size: 13px;
          font-weight: 750;
          line-height: 1.4;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .song-info > span {
          overflow: hidden;
          color: var(--muted);
          font-size: 11px;
          line-height: 1.3;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .song-tag {
          max-width: 70px;
          padding: 5px 7px;
          overflow: hidden;
          border: 1px solid rgba(226, 214, 255, 0.28);
          border-radius: 8px;
          background: rgba(226, 214, 255, 0.13);
          color: #f0e8ff;
          font-size: 9px;
          font-weight: 750;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .row-note {
          flex-shrink: 0;
          color: rgba(255, 231, 166, 0.8);
          font-size: 16px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 150px;
          padding: 20px 8px;
          text-align: center;
        }

        .empty-note {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          margin-bottom: 13px;
          border: 1px solid rgba(199, 240, 214, 0.28);
          border-radius: 17px;
          background: rgba(199, 240, 214, 0.12);
          color: var(--mint);
          font-size: 25px;
        }

        .empty-state strong {
          margin-bottom: 7px;
          color: #fffdf8;
          font-size: 13px;
          font-weight: 750;
        }

        .empty-state > span {
          color: var(--muted);
          font-size: 11px;
        }

        .more-songs {
          margin-top: 12px;
          color: rgba(255, 255, 255, 0.76);
          font-size: 11px;
          font-weight: 700;
          text-align: center;
        }

        .request-footer {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 14px;
          padding: 14px;
          border: 1px solid rgba(255, 231, 166, 0.26);
          border-radius: 17px;
          background: rgba(255, 231, 166, 0.1);
        }

        .footer-note {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 37px;
          height: 37px;
          flex-shrink: 0;
          border: 1px solid rgba(255, 231, 166, 0.25);
          border-radius: 12px;
          background: rgba(255, 231, 166, 0.12);
          color: var(--gold);
          font-size: 20px;
        }

        .footer-copy {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }

        .footer-copy strong {
          color: #fffdf8;
          font-size: 12px;
          font-weight: 800;
        }

        .footer-copy > span {
          color: var(--muted);
          font-size: 10px;
          line-height: 1.5;
        }

        .footer-copy b {
          color: var(--gold);
        }

        .footer-star {
          flex-shrink: 0;
          color: var(--gold);
          font-size: 21px;
        }

        .decor {
          position: absolute;
          z-index: 0;
          pointer-events: none;
          user-select: none;
        }

        .decor-star {
          color: rgba(255, 231, 166, 0.65);
        }

        .star-a {
          top: 30px;
          left: 8px;
          font-size: 22px;
        }

        .star-b {
          right: 8px;
          bottom: 70px;
          color: rgba(226, 214, 255, 0.75);
          font-size: 25px;
        }

        .decor-note {
          color: rgba(199, 240, 214, 0.65);
        }

        .note-a {
          top: 220px;
          right: 5px;
          font-size: 25px;
        }

        .note-b {
          bottom: 25px;
          left: 7px;
          font-size: 21px;
        }

        @media (max-width: 400px) {
          .overlay-stage {
            padding: 5px;
          }

          .queue-panel {
            padding: 12px 25px 25px;
            border-radius: 21px;
          }

          .mascot-frame {
            width: 55px;
            height: 55px;
            border-radius: 17px;
          }

          .stats-row {
            gap: 5px;
          }

          .stat-pill {
            gap: 4px;
            padding: 10px 3px;
            font-size: 10px;
          }

          .song-card {
            padding: 13px;
          }

          .song-row {
            gap: 8px;
            padding: 10px 8px;
          }
        }
      `}</style>
    </main>
  );
}
