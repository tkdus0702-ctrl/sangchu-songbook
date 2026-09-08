"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [songs, setSongs] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const [levelFilter, setLevelFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<number | null>(
    null
  );

  // 커버 자동 검색
  const [updatingCovers, setUpdatingCovers] = useState(false);
  const [coverProgress, setCoverProgress] = useState({
    processed: 0,
    total: 0,
  });

  const [isAdmin, setIsAdmin] = useState(false);

  // 보기 방식
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // 정렬
  const [sortMode, setSortMode] = useState<
    "latest" | "artist" | "title" | "popular"
  >("latest");

  // 로그인
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState("");

  // 좋아요
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});
  const [likedSongs, setLikedSongs] = useState<Record<number, boolean>>({});
  const [userId, setUserId] = useState("");
  const [animatingLike, setAnimatingLike] = useState<number | null>(null);

  // 수정
  const [editingSong, setEditingSong] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editArtist, setEditArtist] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDifficulty, setEditDifficulty] = useState<number | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // 관리자 로그인
  const handleAdminLogin = async () => {
    try {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();

      if (result.success) {
        setIsAdmin(true);
        setShowLogin(false);
        setPassword("");
        alert("관리자 모드가 활성화되었습니다.");
      } else {
        alert(result.message || "로그인에 실패했습니다.");
      }
    } catch (error) {
      console.error(error);
      alert("로그인 중 오류가 발생했습니다.");
    }
  };

  // 관리자 로그아웃
  const handleAdminLogout = async () => {
    const confirmed = confirm("관리자 모드를 종료하시겠습니까?");

    if (!confirmed) return;

    try {
      const response = await fetch("/api/admin-logout", {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        setIsAdmin(false);
        alert("로그아웃되었습니다.");
      } else {
        alert(result.message || "로그아웃에 실패했습니다.");
      }
    } catch (error) {
      console.error(error);
      alert("로그아웃 중 오류가 발생했습니다.");
    }
  };

  // 커버 자동 검색
 const handleUpdateCovers = async () => {
  if (!isAdmin || updatingCovers) return;

  const targets = songs.filter(
    (song) => !song.cover_url
  );

  if (targets.length === 0) {
    alert("이미 모든 노래에 커버가 있습니다.");
    return;
  }

  const confirmed = confirm(
    "커버가 없는 " +
      targets.length +
      "곡의 앨범 커버를 자동으로 찾아볼까요?\n\n" +
      "이미 커버가 있는 노래는 건너뜁니다.\n\n" +
      "Bugs에서 먼저 찾고, 없으면 YouTube에서 찾습니다."
  );

  if (!confirmed) return;

  setUpdatingCovers(true);

  setCoverProgress({
    processed: 0,
    total: targets.length,
  });

  let processed = 0;
  let found = 0;
  let notFound = 0;
  let failed = 0;
  let youtubeLimited = false;

  try {
    for (const song of targets) {
      try {
        console.log(
          "커버 검색 시작:",
          song.title,
          "/",
          song.artist
        );

        const response = await fetch(
          "/api/cover",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              songId: song.id,
            }),
          }
        );

        /*
         * 응답을 바로 response.json()으로 읽지 않고
         * 먼저 text로 받아서 서버에서 이상한 응답이 와도
         * 정확하게 확인할 수 있도록 함
         */
        const responseText =
          await response.text();

        let result: any = null;

        if (responseText.trim()) {
          try {
            result =
              JSON.parse(
                responseText
              );
          } catch (jsonError) {
            console.error(
              "커버 API JSON 변환 실패:",
              song.title,
              responseText
            );

            failed++;

            processed++;

            setCoverProgress({
              processed,
              total:
                targets.length,
            });

            continue;
          }
        } else {
          result = null;
        }

        console.log(
          "커버 API 응답:",
          song.title,
          "HTTP",
          response.status,
          result
        );

        // HTTP 자체가 실패한 경우
        if (!response.ok) {
          failed++;

          console.error(
            "커버 검색 HTTP 실패:",
            song.title,
            "HTTP",
            response.status,
            result
          );
        }

        // 커버 발견
        else if (
          result &&
          result.status ===
            "updated" &&
          result.coverUrl
        ) {
          found++;

          setSongs(
            (currentSongs) =>
              currentSongs.map(
                (currentSong) =>
                  currentSong.id ===
                  song.id
                    ? {
                        ...currentSong,
                        cover_url:
                          result.coverUrl,
                      }
                    : currentSong
              )
          );

          console.log(
            "커버 적용 완료:",
            song.title,
            "(" +
              (result.source ||
                "unknown") +
              ")"
          );
        }

        // 커버 없음
        else if (
          result &&
          result.status ===
            "not_found"
        ) {
          notFound++;

          console.log(
            "커버를 찾지 못함:",
            song.title,
            "/",
            song.artist
          );
        }

        // YouTube API 제한
        else if (
          result &&
          result.status ===
            "youtube_limited"
        ) {
          youtubeLimited = true;
          notFound++;

          console.warn(
            "YouTube API 제한:",
            song.title,
            "/",
            song.artist
          );
        }

        // 빈 응답
        else if (
          result === null ||
          (typeof result ===
            "object" &&
            Object.keys(result)
              .length === 0)
        ) {
          failed++;

          console.error(
            "커버 API가 빈 응답을 반환했습니다:",
            song.title,
            "HTTP",
            response.status,
            "응답:",
            responseText
          );
        }

        // 알 수 없는 응답
        else {
          failed++;

          console.error(
            "알 수 없는 커버 검색 결과:",
            song.title,
            result
          );
        }
      } catch (error) {
        failed++;

        console.error(
          "커버 검색 오류:",
          song.title,
          error
        );
      }

      processed++;

      setCoverProgress({
        processed,
        total: targets.length,
      });

      // 서버 요청 사이에 잠시 대기
      if (
        processed <
        targets.length
      ) {
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              1200
            )
        );
      }
    }

    let message =
      "앨범 커버 검색이 완료되었습니다!\n\n" +
      "전체: " +
      targets.length +
      "곡\n" +
      "찾음: " +
      found +
      "곡\n" +
      "찾지 못함: " +
      notFound +
      "곡\n" +
      "오류: " +
      failed +
      "곡";

    if (youtubeLimited) {
      message +=
        "\n\n⚠️ YouTube API 사용량 제한이 발생했습니다.";
    }

    alert(message);
  } catch (error) {
    console.error(
      "커버 전체 업데이트 오류:",
      error
    );

    alert(
      "앨범 커버 업데이트 중 오류가 발생했습니다."
    );
  } finally {
    setUpdatingCovers(false);

    setCoverProgress({
      processed: 0,
      total: 0,
    });
  }
};

  // 관리자 상태 확인
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await fetch("/api/admin-check");
        const result = await response.json();

        if (result.success) {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error(error);
      }
    };

    checkAdmin();
  }, []);

  // 노래 가져오기
  useEffect(() => {
    const fetchSongs = async () => {
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .order("id", {
          ascending: true,
        });

      if (error) {
        console.error(error);
        return;
      }

      setSongs(data || []);
    };

    fetchSongs();
  }, []);

  // 익명 사용자 ID
  useEffect(() => {
    let id = localStorage.getItem(
      "songbook-user-id"
    );

    if (!id) {
      id = crypto.randomUUID();

      localStorage.setItem(
        "songbook-user-id",
        id
      );
    }

    setUserId(id);
  }, []);

  // 좋아요 가져오기
  useEffect(() => {
    if (!userId) return;

    const fetchLikes = async () => {
      try {
        const response = await fetch(
          "/api/likes?userId=" +
            encodeURIComponent(userId)
        );

        const result = await response.json();

        if (result.success) {
          setLikeCounts(result.likes || {});
          setLikedSongs(
            result.likedByMe || {}
          );
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchLikes();
  }, [userId]);

  // 좋아요
  const handleLike = async (songId: number) => {
    if (!userId) return;

    const isLiked = likedSongs[songId];

    setAnimatingLike(songId);

    setTimeout(() => {
      setAnimatingLike(null);
    }, 350);

    // 화면 먼저 변경
    setLikedSongs((current) => ({
      ...current,
      [songId]: !isLiked,
    }));

    setLikeCounts((current) => ({
      ...current,
      [songId]: Math.max(
        0,
        (current[songId] || 0) +
          (isLiked ? -1 : 1)
      ),
    }));

    try {
      const response = isLiked
        ? await fetch(
            "/api/likes?songId=" +
              songId +
              "&userId=" +
              encodeURIComponent(userId),
            {
              method: "DELETE",
            }
          )
        : await fetch("/api/likes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              songId,
              userId,
            }),
          });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "좋아요 처리 실패"
        );
      }
    } catch (error) {
      console.error(error);

      // 실패하면 원상복구
      setLikedSongs((current) => ({
        ...current,
        [songId]: isLiked,
      }));

      setLikeCounts((current) => ({
        ...current,
        [songId]: Math.max(
          0,
          (current[songId] || 0) +
            (isLiked ? 1 : -1)
        ),
      }));

      alert(
        "좋아요 처리 중 오류가 발생했습니다."
      );
    }
  };

  // 수정창 열기
  const openEdit = (song: any) => {
    setEditingSong(song);
    setEditTitle(song.title || "");
    setEditArtist(song.artist || "");
    setEditLevel(song.level || "");
    setEditCategory(song.category || "");
    setEditDifficulty(
      song.difficulty ?? null
    );
  };

  // 수정창 닫기
  const closeEdit = () => {
    setEditingSong(null);
    setEditTitle("");
    setEditArtist("");
    setEditLevel("");
    setEditCategory("");
    setEditDifficulty(null);
  };

  // 노래 수정
  const handleEdit = async () => {
    if (!editingSong) return;

    if (
      !editTitle.trim() ||
      !editArtist.trim()
    ) {
      alert(
        "노래 제목과 아티스트를 입력해주세요."
      );
      return;
    }

    setSavingEdit(true);

    try {
      const response = await fetch("/api/songs", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingSong.id,
          title: editTitle.trim(),
          artist: editArtist.trim(),
          level: editLevel,
          category: editCategory,
          difficulty: editDifficulty,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(
          result.error ||
            result.message ||
            "노래 수정에 실패했습니다."
        );
        return;
      }

      setSongs((currentSongs) =>
        currentSongs.map((song) =>
          song.id === editingSong.id
            ? result.song
            : song
        )
      );

      closeEdit();

      alert(
        '"' +
          editTitle.trim() +
          '" 노래가 수정되었습니다.'
      );
    } catch (error) {
      console.error(error);

      alert(
        "노래 수정 중 오류가 발생했습니다."
      );
    } finally {
      setSavingEdit(false);
    }
  };
// 커버만 삭제
const handleDeleteCover = async (
  id: number,
  title: string
) => {
  if (!isAdmin) return;

  const confirmed = confirm(
    '"' +
      title +
      '"의 앨범 커버만 삭제하시겠습니까?\n\n' +
      "노래 정보와 좋아요는 삭제되지 않습니다."
  );

  if (!confirmed) return;

  try {
    const response = await fetch("/api/songs", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        clearCover: true,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      alert(
        result.error ||
          result.message ||
          "커버 삭제에 실패했습니다."
      );
      return;
    }

    setSongs((currentSongs) =>
      currentSongs.map((song) =>
        song.id === id
          ? {
              ...song,
              cover_url: null,
            }
          : song
      )
    );

    alert(
      '"' +
        title +
        "의 커버가 삭제되었습니다."
    );
  } catch (error) {
    console.error(error);

    alert(
      "커버 삭제 중 오류가 발생했습니다."
    );
  }
};
  // 노래 삭제
  const handleDelete = async (
    id: number,
    title: string
  ) => {
    const confirmed = confirm(
      '"' +
        title +
        '" 노래를 정말 삭제하시겠습니까?'
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        "/api/songs?id=" + id,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        alert(
          result.error ||
            result.message ||
            "노래 삭제에 실패했습니다."
        );
        return;
      }

      setSongs((currentSongs) =>
        currentSongs.filter(
          (song) => song.id !== id
        )
      );

      alert(
        '"' +
          title +
          '" 노래가 삭제되었습니다.'
      );
    } catch (error) {
      console.error(error);

      alert(
        "노래 삭제 중 오류가 발생했습니다."
      );
    }
  };

  // 검색 + 필터
  const filteredSongs = songs.filter(
    (song) => {
      const keyword =
        search.toLowerCase();

      const title = String(
        song.title || ""
      ).toLowerCase();

      const artist = String(
        song.artist || ""
      ).toLowerCase();

      const matchesSearch =
        title.includes(keyword) ||
        artist.includes(keyword);

      const matchesLevel =
        levelFilter === "" ||
        song.level === levelFilter;

      const matchesCategory =
        categoryFilter === "" ||
        song.category ===
          categoryFilter;

      const matchesDifficulty =
        difficultyFilter === null ||
        song.difficulty ===
          difficultyFilter;

      return (
        matchesSearch &&
        matchesLevel &&
        matchesCategory &&
        matchesDifficulty
      );
    }
  );

  // 정렬
  const sortedSongs = [
    ...filteredSongs,
  ].sort((a, b) => {
    if (sortMode === "latest") {
      return b.id - a.id;
    }

    if (sortMode === "artist") {
      const artistA = String(
        a.artist || ""
      );

      const artistB = String(
        b.artist || ""
      );

      const result =
        artistA.localeCompare(
          artistB,
          "ko"
        );

      if (result !== 0) {
        return result;
      }

      return a.id - b.id;
    }

    if (sortMode === "title") {
      const titleA = String(
        a.title || ""
      );

      const titleB = String(
        b.title || ""
      );

      const result =
        titleA.localeCompare(
          titleB,
          "ko"
        );

      if (result !== 0) {
        return result;
      }

      return a.id - b.id;
    }

    if (sortMode === "popular") {
      const likesA =
        likeCounts[a.id] || 0;

      const likesB =
        likeCounts[b.id] || 0;

      if (likesA !== likesB) {
        return likesB - likesA;
      }

      return a.id - b.id;
    }

    return 0;
  });

  return (
    <main className="min-h-screen bg-[#fffaf5] text-[#3d3028]">
      {/* 헤더 */}
      <header className="border-b border-[#eadfd5] bg-[#fffaf5]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <button
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
            className="group text-left"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8b6f5c] text-lg text-white shadow-sm">
                ♪
              </span>

              <div>
                <h1 className="text-xl font-bold tracking-tight text-[#3d3028]">
                  유상츄 노래책
                </h1>

                <p className="mt-0.5 text-xs text-[#a18d7e]">
                  SOOP 버츄얼 스트리머 유상츄의 노래책
                </p>
              </div>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {!isAdmin && (
              <button
                onClick={() =>
                  setShowLogin(true)
                }
                className="rounded-full border border-[#e7d9ce] bg-white px-4 py-2 text-sm font-medium text-[#8b6f5c] transition hover:bg-[#f8f1eb]"
              >
                🔒 관리자 로그인
              </button>
            )}

            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    window.location.href =
                      "/add";
                  }}
                  className="rounded-full bg-[#8b6f5c] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#725846] hover:shadow-md"
                >
                  + 노래 추가
                </button>

                <button
                  onClick={
                    handleUpdateCovers
                  }
                  disabled={updatingCovers}
                  className="rounded-full border border-[#e7d9ce] bg-white px-4 py-2 text-sm font-medium text-[#8b6f5c] transition hover:bg-[#f8f1eb] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updatingCovers
                    ? "🖼️ " +
                      coverProgress.processed +
                      "/" +
                      coverProgress.total
                    : "🖼️ 커버 자동 찾기"}
                </button>

                <button
                  onClick={
                    handleAdminLogout
                  }
                  className="rounded-full border border-[#e7d9ce] bg-white px-4 py-2 text-sm font-medium text-[#8b6f5c] transition hover:bg-[#f8f1eb]"
                >
                  로그아웃
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 로그인 모달 */}
      {showLogin && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold">
              관리자 로그인
            </h2>

            <p className="mt-1 text-sm text-[#9a887b]">
              관리자 비밀번호를 입력해주세요.
            </p>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAdminLogin();
                }
              }}
              placeholder="비밀번호"
              className="mt-5 w-full rounded-xl border border-[#eadfd5] bg-[#fffaf5] px-4 py-3 text-sm outline-none focus:border-[#8b6f5c]"
              autoFocus
            />

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setShowLogin(false);
                  setPassword("");
                }}
                className="flex-1 rounded-xl border border-[#eadfd5] px-4 py-3 text-sm font-medium text-[#8b6f5c] transition hover:bg-[#f7f1ec]"
              >
                취소
              </button>

              <button
                onClick={
                  handleAdminLogin
                }
                className="flex-1 rounded-xl bg-[#8b6f5c] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#725846]"
              >
                로그인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {editingSong && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold">
              노래 수정
            </h2>

            <p className="mt-1 text-sm text-[#9a887b]">
              노래 정보를 수정해주세요.
            </p>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold">
                노래 제목
              </label>

              <input
                value={editTitle}
                onChange={(e) =>
                  setEditTitle(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-[#eadfd5] bg-[#fffaf5] px-4 py-3 text-sm outline-none focus:border-[#8b6f5c]"
              />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold">
                아티스트
              </label>

              <input
                value={editArtist}
                onChange={(e) =>
                  setEditArtist(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-[#eadfd5] bg-[#fffaf5] px-4 py-3 text-sm outline-none focus:border-[#8b6f5c]"
              />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold">
                종류
              </label>

              <select
                value={editCategory}
                onChange={(e) =>
                  setEditCategory(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-[#eadfd5] bg-white px-4 py-3 outline-none focus:border-[#8b6f5c]"
              >
                <option value="">
                  선택 안 함
                </option>

                <option value="K-POP">
                  K-POP
                </option>

                <option value="J-POP">
                  J-POP
                </option>

                <option value="애교송">
                  애교송
                </option>
              </select>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold">
                곡 레벨
              </label>

              <select
                value={editLevel}
                onChange={(e) =>
                  setEditLevel(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-[#eadfd5] bg-white px-4 py-3 outline-none focus:border-[#8b6f5c]"
              >
                <option value="">
                  선택 안 함
                </option>

                <option value="완곡">
                  완곡
                </option>

                <option value="미완곡">
                  미완곡
                </option>

                <option value="숙제곡">
                  숙제곡
                </option>
              </select>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold">
                난이도
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setEditDifficulty(
                      null
                    )
                  }
                  className={
                    editDifficulty === null
                      ? "flex-1 rounded-xl border border-[#8b6f5c] bg-[#8b6f5c] py-2 text-sm text-white"
                      : "flex-1 rounded-xl border border-[#eadfd5] py-2 text-sm text-[#9a887b]"
                  }
                >
                  선택 안 함
                </button>

                {[1, 2, 3, 4, 5].map(
                  (star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        setEditDifficulty(
                          star
                        )
                      }
                      className={
                        editDifficulty ===
                        star
                          ? "flex-1 rounded-xl border border-[#8b6f5c] bg-[#8b6f5c] py-2 text-sm text-white"
                          : "flex-1 rounded-xl border border-[#eadfd5] bg-white py-2 text-sm"
                      }
                    >
                      {"⭐".repeat(
                        star
                      )}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={closeEdit}
                disabled={savingEdit}
                className="flex-1 rounded-xl border border-[#eadfd5] px-4 py-3 text-sm font-medium text-[#8b6f5c] transition hover:bg-[#f7f1ec] disabled:opacity-50"
              >
                취소
              </button>

              <button
                onClick={handleEdit}
                disabled={savingEdit}
                className="flex-1 rounded-xl bg-[#8b6f5c] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#725846] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingEdit
                  ? "저장 중..."
                  : "수정 저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 본문 */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        {/* 검색 */}
        <div className="mb-5">
          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="노래 제목이나 아티스트 검색..."
            className="w-full rounded-2xl border border-[#eadfd5] bg-white px-5 py-4 text-sm outline-none transition placeholder:text-[#b8a99e] focus:border-[#8b6f5c] focus:ring-2 focus:ring-[#8b6f5c]/10"
          />
        </div>

        {/* 필터 */}
        <div className="mb-8 rounded-2xl border border-[#eadfd5] bg-white p-5">
          <div>
            <p className="mb-2 text-sm font-semibold">
              종류
            </p>

            <div className="flex flex-wrap gap-2">
              {[
                "",
                "K-POP",
                "J-POP",
                "애교송",
              ].map((category) => (
                <button
                  key={
                    category ||
                    "all-category"
                  }
                  onClick={() =>
                    setCategoryFilter(
                      category
                    )
                  }
                  className={
                    categoryFilter ===
                    category
                      ? "rounded-full bg-[#8b6f5c] px-4 py-2 text-sm text-white"
                      : "rounded-full border border-[#eadfd5] bg-white px-4 py-2 text-sm text-[#6f5d50] hover:bg-[#fffaf5]"
                  }
                >
                  {category || "전체"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold">
              곡 레벨
            </p>

            <div className="flex flex-wrap gap-2">
              {[
                "",
                "완곡",
                "미완곡",
                "숙제곡",
              ].map((level) => (
                <button
                  key={
                    level ||
                    "all-level"
                  }
                  onClick={() =>
                    setLevelFilter(level)
                  }
                  className={
                    levelFilter === level
                      ? "rounded-full bg-[#8b6f5c] px-4 py-2 text-sm text-white"
                      : "rounded-full border border-[#eadfd5] bg-white px-4 py-2 text-sm text-[#6f5d50] hover:bg-[#fffaf5]"
                  }
                >
                  {level || "전체"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-sm font-semibold">
              난이도
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  setDifficultyFilter(
                    null
                  )
                }
                className={
                  difficultyFilter ===
                  null
                    ? "rounded-full bg-[#8b6f5c] px-4 py-2 text-sm text-white"
                    : "rounded-full border border-[#eadfd5] bg-white px-4 py-2 text-sm text-[#6f5d50] hover:bg-[#fffaf5]"
                }
              >
                전체
              </button>

              {[1, 2, 3, 4, 5].map(
                (difficulty) => (
                  <button
                    key={difficulty}
                    onClick={() =>
                      setDifficultyFilter(
                        difficulty
                      )
                    }
                    className={
                      difficultyFilter ===
                      difficulty
                        ? "rounded-full bg-[#8b6f5c] px-4 py-2 text-sm text-white"
                        : "rounded-full border border-[#eadfd5] bg-white px-4 py-2 text-sm text-[#6f5d50] hover:bg-[#fffaf5]"
                    }
                  >
                    {"⭐".repeat(
                      difficulty
                    )}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* 제목 + 정렬 + 보기 */}
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">
              내 노래책
            </h2>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1e7de] px-3 py-1.5 text-sm font-medium text-[#8b6f5c]">
                🎵 전체 {songs.length}곡
              </span>

              {filteredSongs.length !==
                songs.length && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#eadfd5] bg-white px-3 py-1.5 text-sm text-[#9a887b]">
                  현재{" "}
                  {
                    filteredSongs.length
                  }
                  곡
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 정렬 */}
            <select
              value={sortMode}
              onChange={(e) =>
                setSortMode(
                  e.target.value as
                    | "latest"
                    | "artist"
                    | "title"
                    | "popular"
                )
              }
              className="rounded-xl border border-[#eadfd5] bg-white px-4 py-2.5 text-sm font-medium text-[#8b6f5c] outline-none transition hover:bg-[#f8f1eb] focus:border-[#8b6f5c]"
            >
              <option value="latest">
                🆕 최신순
              </option>

              <option value="artist">
                🎤 가수 가나다순
              </option>

              <option value="title">
                🎵 제목 가나다순
              </option>

              <option value="popular">
                ❤️ 인기순
              </option>
            </select>

            {/* 보기 전환 */}
            <div className="flex rounded-xl border border-[#eadfd5] bg-white p-1">
              <button
                onClick={() =>
                  setViewMode("grid")
                }
                className={
                  viewMode === "grid"
                    ? "rounded-lg bg-[#8b6f5c] px-3 py-2 text-sm font-medium text-white shadow-sm"
                    : "rounded-lg px-3 py-2 text-sm text-[#8b6f5c] transition hover:bg-[#f8f1eb]"
                }
              >
                ▦ 블럭
              </button>

              <button
                onClick={() =>
                  setViewMode("list")
                }
                className={
                  viewMode === "list"
                    ? "rounded-lg bg-[#8b6f5c] px-3 py-2 text-sm font-medium text-white shadow-sm"
                    : "rounded-lg px-3 py-2 text-sm text-[#8b6f5c] transition hover:bg-[#f8f1eb]"
                }
              >
                ☰ 리스트
              </button>
            </div>
          </div>
        </div>

        {/* 커버 검색 진행 표시 */}
        {updatingCovers && (
          <div className="mb-5 rounded-2xl border border-[#eadfd5] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#6f5d50]">
                  🖼️ 앨범 커버를 찾고 있어요
                </p>

                <p className="mt-1 text-xs text-[#a18d7e]">
                  Bugs → YouTube 순서로
                  검색하고 있습니다.
                </p>
              </div>

              <span className="text-sm font-bold text-[#8b6f5c]">
                {
                  coverProgress.processed
                }
                /
                {
                  coverProgress.total
                }
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f1e7de]">
              <div
                className="h-full rounded-full bg-[#8b6f5c] transition-all duration-300"
                style={{
                  width:
                    coverProgress.total >
                    0
                      ? String(
                          (coverProgress.processed /
                            coverProgress.total) *
                            100
                        ) + "%"
                      : "0%",
                }}
              />
            </div>
          </div>
        )}

        {/* 노래 목록 */}
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "grid gap-4"
          }
        >
          {sortedSongs.map(
            (song) => {
              const isLiked =
                likedSongs[
                  song.id
                ];

              const likes =
                likeCounts[
                  song.id
                ] || 0;

              const isAnimating =
                animatingLike ===
                song.id;

              return (
                <div
                  key={song.id}
                  className={
                    viewMode === "grid"
                      ? "group relative flex min-h-[360px] w-full flex-col overflow-hidden rounded-2xl border border-[#eadfd5] bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#cdbbab] hover:shadow-md"
                      : "group relative flex w-full items-center justify-between overflow-hidden rounded-2xl border border-[#eadfd5] bg-white p-4 pr-20 shadow-sm transition hover:-translate-y-0.5 hover:border-[#cdbbab] hover:shadow-md"
                  }
                >
                  {/* 블럭형 커버 */}
                  {viewMode ===
                    "grid" && (
                    <div className="relative aspect-square w-full overflow-hidden bg-[#f7f1ec]">
                      {song.cover_url ? (
                        <img
                          src={
                            song.cover_url
                          }
                          alt={
                            song.title +
                            " 앨범 커버"
                          }
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <div className="text-center">
                            <div className="text-5xl text-[#cdbbab]">
                              ♪
                            </div>

                            <p className="mt-2 text-xs text-[#b8a99e]">
                              커버 없음
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 리스트형 커버 */}
                  {viewMode ===
                    "list" && (
                    <div className="mr-4 h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#f7f1ec]">
                      {song.cover_url ? (
                        <img
                          src={
                            song.cover_url
                          }
                          alt={
                            song.title +
                            " 앨범 커버"
                          }
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="text-2xl text-[#cdbbab]">
                            ♪
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 노래 정보 */}
                  <div
                    className={
                      viewMode ===
"grid"
  ? "min-w-0 flex-1 p-4"
                        : "min-w-0 flex-1"
                    }
                  >
                    <h3 className="font-bold whitespace-nowrap">
                      {song.title}
                    </h3>

                    <p className="whitespace-normal break-words leading-snug text-[#9a887b]">
                      {song.artist}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {song.category && (
                        <span className="rounded-full bg-[#f1e7de] px-2.5 py-1 text-xs text-[#8b6f5c]">
                          {
                            song.category
                          }
                        </span>
                      )}

                      {song.level && (
                        <span className="rounded-full bg-[#f7f1ec] px-2.5 py-1 text-xs text-[#8b6f5c]">
                          {
                            song.level
                          }
                        </span>
                      )}

                      {song.difficulty && (
                        <span className="rounded-full bg-[#f7f1ec] px-2.5 py-1 text-xs text-[#8b6f5c]">
                          {"⭐".repeat(
                            song.difficulty
                          )}
                        </span>
                      )}
                    </div>

                 {/* 관리자 버튼 */}
{isAdmin && (
  <div
    className={
      viewMode === "grid"
        ? "mt-4 flex flex-wrap items-center gap-2"
        : "mt-3 flex flex-wrap items-center gap-2"
    }
  >
    <button
      onClick={() =>
        openEdit(song)
      }
      className="rounded-lg border border-[#eadfd5] px-3 py-1.5 text-xs font-medium text-[#8b6f5c] transition hover:bg-[#f7f1ec]"
    >
      ✏️ 수정
    </button>

    {/* 커버가 있을 때만 표시 */}
    {song.cover_url && (
      <button
        onClick={() =>
          handleDeleteCover(
            song.id,
            song.title
          )
        }
        className="rounded-lg border border-[#eadfd5] px-3 py-1.5 text-xs font-medium text-[#9a887b] transition hover:bg-[#f7f1ec]"
      >
        🖼️ 커버 삭제
      </button>
    )}

    <button
      onClick={() =>
        handleDelete(
          song.id,
          song.title
        )
      }
      className="rounded-lg border border-[#eadfd5] px-3 py-1.5 text-xs font-medium text-[#a66b5b] transition hover:bg-[#fff1ed]"
    >
      삭제
    </button>
  </div>
)}
                  </div>

                  {/* 좋아요 */}
<button
  onClick={() =>
    handleLike(song.id)
  }
  className={
    viewMode === "grid"
      ? "absolute bottom-11 right-2 flex flex-col items-center justify-center rounded-2xl px-3 py-2 transition " +
        (isLiked
          ? "bg-[#fff4f0]"
          : "bg-transparent hover:bg-[#fffaf5]")
      : "absolute right-4 top-1/2 flex -translate-y-1/2 flex-col items-center justify-center rounded-2xl px-3 py-2 transition " +
        (isLiked
          ? "bg-[#fff4f0]"
          : "bg-transparent hover:bg-[#fffaf5]")
  }
  aria-label={
    isLiked
      ? "좋아요 취소"
      : "좋아요"
  }
>
  <span
    className={
      "transition-transform duration-300 " +
      (isAnimating
        ? "scale-125"
        : "scale-100")
    }
  >
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill={
        isLiked
          ? "#e88b7d"
          : "none"
      }
      stroke={
        isLiked
          ? "#e88b7d"
          : "#b8a99e"
      }
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.8 8.7c0 5.2-8.8 10.1-8.8 10.1S3.2 13.9 3.2 8.7C3.2 5.8 5.3 4 7.8 4c1.5 0 2.9.7 4.2 2 1.3-1.3 2.7-2 4.2-2 2.5 0 4.6 1.8 4.6 4.7Z" />
    </svg>
  </span>

  <span
    className={
      "mt-0.5 text-xs font-semibold " +
      (isLiked
        ? "text-[#e88b7d]"
        : "text-[#b8a99e]")
    }
  >
    {likes}
  </span>
</button>
                </div>
              );
            }
          )}
        </div>

        {/* 검색 결과 없음 */}
        {sortedSongs.length ===
          0 && (
          <div className="py-16 text-center">
            <div className="text-4xl">
              🔍
            </div>

            <p className="mt-4 font-medium">
              검색 결과가 없어요
            </p>

            <p className="mt-1 text-sm text-[#9a887b]">
              다른 제목이나 아티스트를
              검색해보세요.
            </p>
          </div>
        )}
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-center text-xs text-[#b8a99e]">
        SANGCHU SONGBOOK
      </footer>
    </main>
  );
}