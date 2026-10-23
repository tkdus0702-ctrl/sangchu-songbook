
"use client";

import { useRef, useState } from "react";

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
        if (window.SOOP?.ChatSDK) resolve();
        else reject(new Error("SOOP.ChatSDK를 찾을 수 없습니다."));
      };
      script.onerror = () => reject(new Error("SOOP SDK 로드 실패"));
      document.head.appendChild(script);
    });
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
        throw new Error(tokenData.error ?? "토큰을 가져오지 못했습니다.");
      }

      await loadSdk();

      const sdk = new window.SOOP!.ChatSDK(CLIENT_ID);
      sdkRef.current = sdk;

      sdk.setAuth(tokenData.accessToken);

      sdk.handleMessageReceived((action, message) => {
        if (action === "MESSAGE") {
          log(`[${message.userNickname ?? "사용자"}] ${message.message ?? ""}`);
        } else {
          log(`이벤트: ${action}`);
        }
      });

      sdk.handleChatClosed(() => {
        setStatus("채팅 연결이 종료되었습니다.");
        log("채팅 연결 종료");
        sdkRef.current = null;
      });

      sdk.handleError((code, message) => {
        setStatus(`SDK 오류: ${code}`);
        log(`SDK 오류 ${code}: ${message}`);
      });

      setStatus("채팅 서버 연결 중...");
      log("connect() 호출");

      await sdk.connect();

      const room = await sdk.getRoomInfo();

      setStatus(`연결된 방송: ${room.bjId}`);
      log(`방송 ID: ${room.bjId}`);
      log(`채팅 번호: ${room.chatNumber}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      setStatus(`실패: ${message}`);
      log(`실패: ${message}`);
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

  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: 20 }}>
      <h1>SOOP Chat SDK 테스트</h1>
      <p>관리자 로그인 후 테스트 방송의 채팅 연결을 확인합니다.</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={connectChat} style={{ padding: "10px 16px" }}>
          채팅 연결
        </button>

        <button onClick={disconnectChat} style={{ padding: "10px 16px" }}>
          연결 해제
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
