
"use client";

import { useState } from "react";

declare global {
  interface Window {
    SOOP?: {
      ChatSDK: new (
        clientId: string,
        clientSecret?: string
      ) => {
        init: () => void;
        openAuth: () => void;
        getAuth: (code: string) => Promise<unknown>;
        setAuth: (token: string) => void;
        connect: () => Promise<unknown> | void;
        disconnect: () => void;
        getRoomInfo: () => Promise<{
          chatNumber: number;
          bjId: string;
        }>;
        handleMessageReceived: (
          callback: (action: string, message: {
            message?: string;
            userId?: string;
            userNickname?: string;
          }) => void
        ) => void;
        handleChatClosed: (callback: () => void) => void;
        handleError: (
          callback: (code: string, message: string) => void
        ) => void;
      };
    };
  }
}

export default function SoopTestPage() {
  const [status, setStatus] = useState("SDK를 불러오지 않았습니다.");
  const [logs, setLogs] = useState<string[]>([]);
  const [clientId, setClientId] = useState("");
  const [accessToken, setAccessToken] = useState("");

  function log(message: string) {
    setLogs((prev) => [
      `${new Date().toLocaleTimeString()} ${message}`,
      ...prev,
    ]);
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
      script.onerror = () =>
        reject(new Error("SOOP SDK 스크립트를 불러오지 못했습니다."));
      document.head.appendChild(script);
    });
  }

  async function startTest() {
    try {
      if (!clientId.trim()) {
        setStatus("Client ID를 입력해 주세요.");
        return;
      }

      await loadSdk();
      setStatus("SDK 로드 완료");
      log("SDK 로드 완료");

      const sdk = new window.SOOP!.ChatSDK(clientId.trim());

      if (!accessToken.trim()) {
        setStatus("SDK 초기화 완료. 인증 절차를 시작합니다.");
        log("SOOP 인증 화면을 엽니다.");
        sdk.openAuth();
        return;
      }

      sdk.setAuth(accessToken.trim());

      sdk.handleError((code, message) => {
        setStatus(`SDK 오류: ${code}`);
        log(`오류 ${code}: ${message}`);
      });

      sdk.handleChatClosed(() => {
        setStatus("채팅 연결이 종료되었습니다.");
        log("채팅 연결 종료");
      });

      sdk.handleMessageReceived((action, message) => {
        if (action === "MESSAGE") {
          log(
            `[${message.userNickname ?? "사용자"}] ${message.message ?? ""}`
          );
        } else {
          log(`이벤트: ${action}`);
        }
      });

      setStatus("채팅 서버에 연결 중...");
      log("connect() 호출");

      await sdk.connect();

      setStatus("connect() 요청 완료. 방송 정보를 확인합니다.");
      log("connect() 요청 완료");

      const room = await sdk.getRoomInfo();

      log(`연결된 방송 ID: ${room.bjId}`);
      log(`채팅 번호: ${room.chatNumber}`);
      setStatus(`연결된 방송: ${room.bjId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      setStatus(`실패: ${message}`);
      log(`실패: ${message}`);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: 20 }}>
      <h1>SOOP Chat SDK 테스트</h1>
      <p>
        테스트용 페이지입니다. 먼저 Client ID로 인증을 시작한 뒤,
        발급받은 액세스 토큰으로 연결을 테스트할 수 있습니다.
      </p>

      <label style={{ display: "block", marginTop: 20 }}>
        Client ID
        <input
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          style={{ display: "block", width: "100%", padding: 10 }}
        />
      </label>

      <label style={{ display: "block", marginTop: 16 }}>
        Access Token (선택)
        <input
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          placeholder="테스트용 액세스 토큰"
          type="password"
          autoComplete="off"
          style={{ display: "block", width: "100%", padding: 10 }}
        />
      </label>

      <button
        onClick={startTest}
        style={{ marginTop: 16, padding: "10px 18px" }}
      >
        SDK 로드 및 인증 시작
      </button>

      <h2>상태</h2>
      <p>{status}</p>

      <h2>로그</h2>
      <div
        style={{
          background: "#111",
          color: "#eee",
          padding: 16,
          borderRadius: 8,
          minHeight: 180,
          overflowWrap: "anywhere",
        }}
      >
        {logs.map((entry, index) => (
          <p key={`${entry}-${index}`} style={{ margin: "6px 0" }}>
            {entry}
          </p>
        ))}
      </div>
    </main>
  );
}
