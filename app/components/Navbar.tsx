
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { label: "PROFILE", href: "/" },
  { label: "SCHEDULE", href: "/schedule" },
  { label: "YOUTUBE", href: "/youtube" },
  { label: "SONGBOOK", href: "/songbook" },
];

export default function Navbar() {
  const pathname = usePathname();

  const [isAdmin, setIsAdmin] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 기존 관리자 로그인 상태 확인
  useEffect(() => {
    fetch("/api/admin-check", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setIsAdmin(data.success))
      .catch(() => setIsAdmin(false));
  }, []);

  // 관리자 로그인
  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password.trim()) {
      setError("비밀번호를 입력해주세요.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message || "로그인에 실패했습니다.");
        return;
      }

      setIsAdmin(true);
      setPassword("");
      setModalOpen(false);

      // 현재 페이지의 관리자 권한 UI 갱신
      window.dispatchEvent(new Event("admin-status-change"));
    } catch {
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  // 관리자 로그아웃
  async function handleLogout() {
    if (!confirm("관리자 로그아웃을 할까요?")) return;

    setBusy(true);

    try {
      const response = await fetch("/api/admin-logout", {
        method: "POST",
      });

      if (!response.ok) {
        alert("로그아웃에 실패했습니다.");
        return;
      }

      setIsAdmin(false);
      window.dispatchEvent(new Event("admin-status-change"));
    } catch {
      alert("로그아웃 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[#dce6bd] bg-[#f7f9e9]/95 backdrop-blur-xl">
        <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Link
            href="/"
            className="text-xl font-black tracking-[0.12em] text-[#416b36]"
          >
            SANGCHU<span className="text-[#a8cb68]">.</span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-8">
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative py-2 text-[10px] font-bold tracking-[0.08em] transition-colors sm:text-xs sm:tracking-[0.13em] ${
                    active
                      ? "text-[#54823d]"
                      : "text-[#8b9877] hover:text-[#54823d]"
                  }`}
                >
                  {item.label}

                  {active && (
                    <span className="absolute bottom-0 left-0 h-[3px] w-full rounded-full bg-[#a8cb68]" />
                  )}
                </Link>
              );
            })}

            {/* 관리자 자물쇠 버튼 */}
            <button
              type="button"
              onClick={() => {
                if (isAdmin) {
                  handleLogout();
                } else {
                  setError("");
                  setModalOpen(true);
                }
              }}
              disabled={busy}
              title={isAdmin ? "관리자 로그아웃" : "관리자 로그인"}
              aria-label={isAdmin ? "관리자 로그아웃" : "관리자 로그인"}
              className={`ml-1 flex h-9 w-9 items-center justify-center rounded-full border transition-all ${
                isAdmin
                  ? "border-[#a8cb68] bg-[#eaf2dc] text-[#54823d]"
                  : "border-[#dce6bd] bg-white/60 text-[#8b9877] hover:border-[#a8cb68] hover:bg-[#edf4df] hover:text-[#54823d]"
              }`}
            >
              {isAdmin ? (
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                  <path d="M12 15v3" />
                </svg>
              ) : (
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* 관리자 로그인 모달 */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setModalOpen(false);
            }
          }}
        >
          <form
            onSubmit={handleLogin}
            className="w-full max-w-sm rounded-[2rem] border border-[#dce6bd] bg-[#f7f9e9] p-7 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-[0.2em] text-[#9ab477]">
                  ADMIN ACCESS
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#416b36]">
                  관리자 로그인
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-2 text-[#8b9877] hover:bg-[#eaf0dc]"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <p className="mb-5 text-sm text-[#82936e]">
              관리자 비밀번호를 입력해주세요.
            </p>

            <input
              type="password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호"
              className="w-full rounded-xl border border-[#dce6bd] bg-white px-4 py-3 text-sm text-[#416b36] outline-none transition focus:border-[#8caf59]"
            />

            {error && (
              <p className="mt-3 text-sm font-medium text-rose-500">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-5 w-full rounded-xl bg-[#8caf59] py-3 text-sm font-bold text-white transition hover:bg-[#739b45] disabled:opacity-50"
            >
              {busy ? "로그인 중..." : "로그인"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
