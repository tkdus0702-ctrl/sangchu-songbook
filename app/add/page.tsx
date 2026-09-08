"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AddSongPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !artist.trim()) {
      alert("노래 제목과 아티스트를 입력해주세요.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/songs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          artist: artist.trim(),
          level,
          category,
          difficulty,
        }),
      });

      const result = await response.json();

      console.log("노래 추가 결과:", result);

      if (!response.ok) {
        alert(
          result.error ||
            result.message ||
            "노래 저장에 실패했습니다."
        );
        return;
      }

      alert("노래가 저장되었습니다!");
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("노래 저장 오류:", error);
      alert("노래 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fffaf5] text-[#3d3028]">
      <header className="border-b border-[#eadfd5] bg-white/80">
        <div className="mx-auto max-w-3xl px-6 py-5">
          <Link
            href="/"
            className="text-sm text-[#9a887b] hover:text-[#8b6f5c]"
          >
            ← 노래책으로 돌아가기
          </Link>

          <h1 className="mt-4 text-2xl font-bold">
            새 노래 추가
          </h1>

          <p className="mt-1 text-sm text-[#9a887b]">
            노래 정보를 입력해주세요.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-[#eadfd5] bg-white p-6 shadow-sm"
        >
          <div className="space-y-6">

            {/* 노래 제목 */}
            <div>
              <label className="mb-2 block text-sm font-semibold">
                노래 제목
              </label>

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 사랑하게 될 거야"
                className="w-full rounded-xl border border-[#eadfd5] px-4 py-3 outline-none focus:border-[#8b6f5c] focus:ring-2 focus:ring-[#8b6f5c]/10"
              />
            </div>

            {/* 아티스트 */}
            <div>
              <label className="mb-2 block text-sm font-semibold">
                아티스트
              </label>

              <input
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="예: 한로로"
                className="w-full rounded-xl border border-[#eadfd5] px-4 py-3 outline-none focus:border-[#8b6f5c] focus:ring-2 focus:ring-[#8b6f5c]/10"
              />
            </div>

            {/* 종류 */}
            <div>
              <label className="mb-2 block text-sm font-semibold">
                종류
              </label>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-[#eadfd5] bg-white px-4 py-3 outline-none focus:border-[#8b6f5c] focus:ring-2 focus:ring-[#8b6f5c]/10"
              >
                <option value="">선택 안 함</option>
                <option value="K-POP">K-POP</option>
                <option value="J-POP">J-POP</option>
                <option value="애교송">애교송</option>
              </select>
            </div>

            {/* 곡 레벨 */}
            <div>
              <label className="mb-2 block text-sm font-semibold">
                곡 레벨
              </label>

              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full rounded-xl border border-[#eadfd5] bg-white px-4 py-3 outline-none focus:border-[#8b6f5c] focus:ring-2 focus:ring-[#8b6f5c]/10"
              >
                <option value="">선택 안 함</option>
                <option value="완곡">완곡</option>
                <option value="미완곡">미완곡</option>
                <option value="숙제곡">숙제곡</option>
              </select>
            </div>

            {/* 난이도 */}
            <div>
              <label className="mb-2 block text-sm font-semibold">
                난이도
              </label>

              <button
                type="button"
                onClick={() => setDifficulty(null)}
                className="mb-3 rounded-xl border border-[#eadfd5] px-4 py-2 text-sm text-[#9a887b] hover:bg-[#fffaf5]"
              >
                난이도 선택 안 함
              </button>

              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setDifficulty(star)}
                    className={
                      difficulty === star
                        ? "flex-1 rounded-xl border border-[#8b6f5c] bg-[#8b6f5c] py-3 text-xl text-white transition"
                        : "flex-1 rounded-xl border border-[#eadfd5] bg-white py-3 text-xl text-[#c8b8aa] transition hover:bg-[#fffaf5]"
                    }
                  >
                    {"⭐".repeat(star)}
                  </button>
                ))}
              </div>

              <p className="mt-2 text-xs text-[#9a887b]">
                현재 난이도:{" "}
                {difficulty === null
                  ? "선택 안 함"
                  : difficulty + " / 5"}
              </p>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 pt-2">
              <Link
                href="/"
                className="flex-1 rounded-xl border border-[#eadfd5] py-3 text-center text-sm font-medium hover:bg-[#fffaf5]"
              >
                취소
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-[#8b6f5c] py-3 text-sm font-medium text-white transition hover:bg-[#725846] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "저장 중..." : "노래 저장하기"}
              </button>
            </div>

          </div>
        </form>
      </section>
    </main>
  );
}