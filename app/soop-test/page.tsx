
"use client";

import { useEffect, useRef, useState } from "react";
type ChatMessage = {
  message?: string;
  userId?: string;
  userNickname?: string;
};

type ChatSdk = {
  setAuth: (token: string) => void;
  connect: () => Promise<unknown> | void;
  disconnect: () => void;
  getRoomInfo: () => Promise<{
    chatNumber: number;
    bjId: string;
  }>;
  handleMessageReceived: (
    callback: (action: string, message: ChatMessage) => void
  ) => void;
  handleChatClosed: (callback: () => void) => void;
  handleError: (callback: (code: string, message: string) => void) => void;
};

declare global {
  interface Window {
    SOOP?: {
      ChatSDK: new (clientId: string) => ChatSdk;
    };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_SOOP_CLIENT_ID;

export default function SoopTestPage() {
  const sdkRef = useRef<ChatSdk | null>(null);
  const processingRef = useRef<Set<string>>(new Set());

  const [status, setStatus] = useState("연결 전");
  const [logs, setLogs] = useState<string[]>([]);

  function log(message: string) {
    setLogs((prev) =>
      [`${new Date().toLocaleTimeString()} ${message}`, ...prev].slice(0, 100)
    );
  }

  function loadSdk(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.SOOP?.ChatSDK) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src =
        "https://static.sooplive.com/asset/app/chat-sdk/sooplive-chat-sdk.js";

      script.onload = () => {
        if (window.SOOP?.ChatSDK) {
          resolve();
        } else {
          reject(new Error("SOOP.ChatSDK를 찾을 수 없습니다."));
        }
      };

      script.onerror = () => reject(new Error("SOOP SDK 로드 실패"));
      document.head.appendChild(script);
    });
  }

  // !요청 제목 명령 처리
  async function handleSongRequest(message: ChatMessage) {
    const text = String(message.message ?? "").trim();

    // !요청 뒤에 제목이 있는 메시지만 처리
    const match = text.match(/^!요청\s+(.+)$/u);

    if (!match) return;

    const title = match[1].trim();
    const userId = String(message.userId ?? "").trim();
    const nickname = message.userNickname ?? userId ?? "알 수 없는 사용자";

    if (!title) {
      log("요청 제목이 비어 있습니다.");
      return;
    }

    if (!userId) {
      log(`[${nickname}] 사용자 ID가 없어 요청을 등록하지 못했습니다.`);
      return;
    }

    // 같은 메시지의 중복 처리를 방지
    const processingKey = `${userId}:${text}`;

    if (processingRef.current.has(processingKey)) {
      return;
    }

    processingRef.current.add(processingKey);

    try {
      log(`[${nickname}] 노래 검색 중: ${title}`);

      const response = await fetch("/api/soop/chat-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          title,
          userId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        log(
          `[${nickname}] 요청 처리 실패: ${
            result.message ?? "알 수 없는 오류"
          }`
        );
        return;
      }

      const song = result.request;

      log(
        `[${nickname}] 요청 등록 완료: ${song.title} - ${song.artist}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      log(`[${nickname}] 요청 처리 중 오류: ${errorMessage}`);
    } finally {
      processingRef.current.delete(processingKey);
    }
  }

  async function connectChat() {
    try {
      if (sdkRef.current) {
        setStatus("이미 연결을 시도했어요. 먼저 연결을 해제해 주세요.");
        return;
      }

      if (!CLIENT_ID) {
        throw new Error("NEXT_PUBLIC_SOOP_CLIENT_ID 환경 변수가 없습니다.");
      }

      setStatus("관리자 인증 및 토큰 확인 중...");

      const tokenResponse = await fetch("/api/soop/test-token", {
        cache: "no-store",
        credentials: "same-origin",
      });

      const tokenData = await tokenResponse.json();

     if (!tokenResponse.ok || !tokenData.accessToken) {
  // 토큰이 없으면 SOOP 인증으로 이동
  window.location.replace("/api/soop/auth");
  return;
}

      await loadSdk();

      const sdk = new window.SOOP!.ChatSDK(CLIENT_ID);
      sdkRef.current = sdk;

      sdk.setAuth(tokenData.accessToken);

      sdk.handleMessageReceived((action, message) => {
        if (action === "MESSAGE") {
          const nickname = message.userNickname ?? "사용자";
          const text = message.message ?? "";

          log(`[${nickname}] ${text}`);

          // 노래 요청 명령만 서버로 전달
          if (/^!요청\s+/u.test(text.trim())) {
            void handleSongRequest(message);
          }
        } else {
          log(`이벤트: ${action}`);
        }
      });

      sdk.handleChatClosed(() => {
        setStatus("채팅 연결이 종료되었습니다.");
        log("채팅 연결 종료");

        if (sdkRef.current === sdk) {
          sdkRef.current = null;
        }
      });

     sdk.handleError((code, message) => {
  const errorCode = String(code ?? "");
  const errorMessage = String(message ?? "");

  // SDK가 채팅 서버 접속 관련 안내를 보낸 경우
  // 실제 채팅 연결이 유지되고 있으면 화면 로그에서 제외
  if (
    errorCode.includes("sdk-error") &&
    errorMessage.includes("채팅 서버 접속 후 시도해주세요")
  ) {
    console.warn("[SOOP SDK 참고 오류]", errorCode, errorMessage);
    return;
  }

console.warn("[SOOP SDK 오류]", {
  code,
  message,
  time: new Date().toISOString(),
});
});
      setStatus("채팅 서버 연결 중...");
      log("connect() 호출");

      await sdk.connect();

      log("connect() 완료. 채팅 서버 연결 상태를 확인합니다.");

      await new Promise((resolve) => setTimeout(resolve, 3000));

      const room = await sdk.getRoomInfo();

      if (!room.bjId || room.chatNumber === 0) {
        setStatus("방송 정보를 가져오지 못했습니다.");
        log("방송 ID 또는 채팅 번호가 비어 있습니다.");
        log("SDK 연결 오류 및 브라우저 콘솔을 확인해 주세요.");
        return;
      }

      setStatus(`연결된 방송: ${room.bjId}`);
      log(`방송 ID: ${room.bjId}`);
      log(`채팅 번호: ${room.chatNumber}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      setStatus(`실패: ${message}`);
      log(`실패: ${message}`);

      if (sdkRef.current) {
        try {
          sdkRef.current.disconnect();
        } catch {
          // 연결 정리 중 발생한 오류는 무시
        }
      }

      sdkRef.current = null;
    }
  }

  function disconnectChat() {
    if (!sdkRef.current) {
      setStatus("현재 연결된 SDK가 없습니다.");
      return;
    }

    try {
      sdkRef.current.disconnect();
      sdkRef.current = null;
      setStatus("연결 해제 요청 완료");
      log("disconnect() 호출");
    } catch (error) {
      log(
        `연결 해제 오류: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

async function resetSoopAuth() {
  const confirmed = window.confirm(
    "SOOP 인증을 초기화할까요?\n저장된 토큰이 삭제되며, 다시 연결할 때 인증해야 합니다."
  );

  if (!confirmed) return;

  try {
    // 현재 브라우저의 채팅 SDK 연결 종료
    const sdk = sdkRef.current;
sdkRef.current = null;

if (sdk) {
  try {
    sdk.disconnect();
  } catch (error) {
    console.warn("SDK 연결 해제 중 오류:", error);
  }
}

    setStatus("SOOP 인증 초기화 중...");
    log("SOOP 인증 초기화를 시작합니다.");

    const response = await fetch("/api/soop/reset-auth", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error ?? "SOOP 인증 초기화에 실패했습니다."
      );
    }

    setStatus("SOOP 인증 초기화 완료");
    log("Supabase에 저장된 SOOP 토큰을 삭제했습니다.");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    setStatus(`인증 초기화 실패: ${message}`);
    log(`인증 초기화 실패: ${message}`);
  }
}

// URL에 자동 연결 요청이 있으면 채팅을 자동으로 연결
useEffect(() => {
  const url = new URL(window.location.href);

  if (url.searchParams.get("autoconnect") !== "1") {
    return;
  }

  // 새로고침으로 인한 중복 연결 방지
  url.searchParams.delete("autoconnect");

  window.history.replaceState(
    {},
    "",
    url.pathname + url.search + url.hash
  );

  void connectChat();
}, []);
  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: 20 }}>
      <h1>SOOP Chat SDK 테스트</h1>
      <p>관리자 로그인 후 방송 채팅을 연결합니다.</p>
      <p>채팅의 !요청 제목 명령은 노래책 검색 후 대기 요청에 등록됩니다.</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={connectChat} style={{ padding: "10px 16px" }}>
          채팅 연결
        </button>

        <button onClick={disconnectChat} style={{ padding: "10px 16px" }}>
          연결 해제
        </button>
          <button
    onClick={resetSoopAuth}
    style={{
      padding: "10px 16px",
      color: "#b42318",
      border: "1px solid #f0c5c2",
      borderRadius: 6,
      background: "#fff",
    }}
  >
    SOOP 인증 초기화
  </button>
      </div>

      <h2>상태</h2>
      <p>{status}</p>

      <h2>채팅 로그</h2>

      <div
        style={{
          background: "#111",
          color: "#eee",
          padding: 16,
          borderRadius: 8,
          minHeight: 200,
          overflowWrap: "anywhere",
        }}
      >
        {logs.length === 0 ? (
          <p>아직 수신된 메시지가 없습니다.</p>
        ) : (
          logs.map((entry, index) => <p key={index}>{entry}</p>)
        )}
      </div>
    </main>
  );
}
