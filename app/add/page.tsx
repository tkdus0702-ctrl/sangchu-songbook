
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Category = {
  id: number;
  name: string;
  position: number;
};

export default function AddSongPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState("");
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories", {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "카테고리를 불러오지 못했습니다.");
        }

        setCategoryList(result.categories ?? []);
      } catch (error) {
        console.error("[카테고리 조회 오류]", error);
        setCategoryError(
          error instanceof Error
            ? error.message
            : "카테고리를 불러오지 못했습니다."
        );
      } finally {
        setLoadingCategories(false);
      }
    };

    void fetchCategories();
  }, []);

  const toggleCategory = (category: string) => {
    setCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    );
  };

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          artist: artist.trim(),
          category: categories.join(","),
          difficulty,
        }),
      });

      const result = await response.json();
      console.log("노래 추가 결과:", result);

      if (!response.ok) {
        alert(result.error || result.message || "노래 저장에 실패했습니다.");
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

          <h1 className="mt-4 text-2xl font-bold">새 노래 추가</h1>
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

            <div>
              <label className="mb-2 block text-sm font-semibold">
                카테고리
              </label>
              <p className="mb-3 text-xs text-[#9a887b]">
                여러 개를 선택할 수 있습니다.
              </p>

              {loadingCategories ? (
                <p className="text-sm text-[#9a887b]">
                  카테고리를 불러오는 중...
                </p>
              ) : categoryError ? (
                <p className="text-sm text-red-500">
                  {categoryError}
                </p>
              ) : categoryList.length === 0 ? (
                <p className="text-sm text-[#9a887b]">
                  등록된 카테고리가 없습니다.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categoryList.map((category) => {
                    const selected = categories.includes(category.name);

                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleCategory(category.name)}
                        className={
                          selected
                            ? "rounded-full border border-[#8b6f5c] bg-[#8b6f5c] px-4 py-2 text-sm font-medium text-white transition"
                            : "rounded-full border border-[#eadfd5] bg-white px-4 py-2 text-sm text-[#9a887b] transition hover:bg-[#fffaf5]"
                        }
                      >
                        {selected && "✓ "}
                        {category.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {categories.length > 0 && (
                <p className="mt-3 text-xs text-[#9a887b]">
                  선택한 카테고리: {categories.join(", ")}
                </p>
              )}
            </div>

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
                {difficulty === null ? "선택 안 함" : `${difficulty} / 5`}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Link
                href="/"
                className="flex-1 rounded-xl border border-[#eadfd5] py-3 text-center text-sm font-medium hover:bg-[#fffaf5]"
              >
                취소
              </Link>

              <button
                type="submit"
                disabled={saving || loadingCategories || !!categoryError}
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
