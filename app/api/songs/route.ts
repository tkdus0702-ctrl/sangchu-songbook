import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

// =====================================================
// 외부 요청 시간 제한
// =====================================================
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 7000
) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}

// =====================================================
// 문자열 정리
// =====================================================
function normalize(value: string) {
  return (value || "")
    .toLowerCase()
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/[()[\]{}:：'"!?！？.,·•/\\|_-]/g, " ")
    .replace(
      /\b(feat|ft|featuring|with)\b/gi,
      " "
    )
    .replace(
      /\b(official|audio|video|mv|music video|remastered|remaster)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompact(value: string) {
  return normalize(value).replace(/\s+/g, "");
}

function similarity(a: string, b: string) {
  const x = normalize(a);
  const y = normalize(b);

  const compactX = normalizeCompact(a);
  const compactY = normalizeCompact(b);

  if (!x || !y) {
    return 0;
  }

  if (x === y) {
    return 1;
  }

  if (compactX === compactY) {
    return 1;
  }

  if (
    compactX.includes(compactY) ||
    compactY.includes(compactX)
  ) {
    return 0.9;
  }

  const aWords = x.split(" ").filter(Boolean);
  const bWords = y.split(" ").filter(Boolean);

  if (
    aWords.length === 0 ||
    bWords.length === 0
  ) {
    return 0;
  }

  let matched = 0;

  for (const word of aWords) {
    const found = bWords.some(
      (bWord) =>
        bWord === word ||
        bWord.includes(word) ||
        word.includes(bWord)
    );

    if (found) {
      matched++;
    }
  }

  return (
    matched /
    Math.max(
      aWords.length,
      bWords.length
    )
  );
}

function titleMatches(
  wantedTitle: string,
  resultTitle: string
) {
  const wanted = normalizeCompact(wantedTitle);
  const result = normalizeCompact(resultTitle);

  if (!wanted || !result) {
    return false;
  }

  if (wanted === result) {
    return true;
  }

  if (result.includes(wanted)) {
    return true;
  }

  if (
    wanted.includes(result) &&
    result.length >= 2
  ) {
    return true;
  }

  return false;
}

// =====================================================
// 이미지 URL 정리
// =====================================================
function normalizeImageUrl(
  src: string,
  baseUrl = "https://music.bugs.co.kr/"
) {
  if (!src) {
    return null;
  }

  let url = src.trim();

  if (!url) {
    return null;
  }

  url = url
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x2F;/gi, "/")
    .replace(/&#47;/gi, "/")
    .replace(/&#39;/gi, "'")
    .replace(/\\\//g, "/")
    .replace(/^['"]|['"]$/g, "");

  if (url.startsWith("//")) {
    url = "https:" + url;
  }

  if (url.startsWith("/")) {
    try {
      url = new URL(url, baseUrl).href;
    } catch {
      return null;
    }
  }

  if (
    !url.startsWith("http://") &&
    !url.startsWith("https://")
  ) {
    return null;
  }

  return url;
}

// =====================================================
// Bugs 이미지 URL인지 확인
// =====================================================
function isValidBugsImageUrl(url: string) {
  const lower = url.toLowerCase();

  if (!lower.includes("image.bugsm.co.kr")) {
    return false;
  }

  if (!lower.includes("/album/images/")) {
    return false;
  }

  const badWords = [
    "logo",
    "icon",
    "favicon",
    "default",
    "placeholder",
    "loading",
    "sprite",
    "btn_",
    "button",
  ];

  return !badWords.some((word) =>
    lower.includes(word)
  );
}

// =====================================================
// 이미지 확인
// =====================================================
async function checkImage(url: string) {
  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: "HEAD",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
          Accept:
            "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          Referer:
            "https://music.bugs.co.kr/",
        },
      },
      4000
    );

    if (response.ok) {
      const type =
        response.headers.get("content-type") || "";

      if (
        !type ||
        type.toLowerCase().startsWith("image/")
      ) {
        return true;
      }
    }

    const getResponse = await fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
          Range: "bytes=0-10",
          Referer:
            "https://music.bugs.co.kr/",
        },
      },
      4000
    );

    if (!getResponse.ok) {
      return false;
    }

    const type =
      getResponse.headers.get("content-type") || "";

    return (
      !type ||
      type.toLowerCase().startsWith("image/")
    );
  } catch {
    return false;
  }
}

// =====================================================
// Bugs API 데이터에서 이미지 URL 추출
// =====================================================
function extractBugsImageUrls(
  value: any,
  keyName = "",
  result: {
    url: string;
    priority: number;
  }[] = [],
  visited = new Set<any>()
) {
  if (
    value === null ||
    value === undefined
  ) {
    return result;
  }

  if (typeof value === "object") {
    if (visited.has(value)) {
      return result;
    }

    visited.add(value);
  }

  if (typeof value === "string") {
    const urls =
      value.match(
        /https?:\/\/[^\s"'<>]+/gi
      ) || [];

    for (const rawUrl of urls) {
      const url = normalizeImageUrl(rawUrl);

      if (!url) {
        continue;
      }

      const lower = url.toLowerCase();

      if (
        !lower.includes("bugsm.co.kr") &&
        !lower.includes("bugs.co.kr")
      ) {
        continue;
      }

      if (
        !lower.includes("image") &&
        !lower.match(
          /\.(jpg|jpeg|png|webp)(\?|$)/
        )
      ) {
        continue;
      }

      let priority = 0;

      const lowerKey = keyName.toLowerCase();

      if (lowerKey.includes("cover")) {
        priority += 100;
      }

      if (lowerKey.includes("image")) {
        priority += 90;
      }

      if (lowerKey.includes("img")) {
        priority += 80;
      }

      if (lowerKey.includes("album")) {
        priority += 50;
      }

      if (lower.includes("/album/images/")) {
        priority += 50;
      }

      if (lower.includes("/1000/")) {
        priority += 20;
      }

      result.push({
        url,
        priority,
      });
    }

    return result;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      extractBugsImageUrls(
        item,
        keyName,
        result,
        visited
      );
    }

    return result;
  }

  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      extractBugsImageUrls(
        child,
        key,
        result,
        visited
      );
    }
  }

  return result;
}

// =====================================================
// Bugs 앨범 페이지 실제 이미지 추출
// =====================================================
async function extractBugsAlbumPageImages(
  albumId: string | number
) {
  const id = String(albumId).trim();

  if (!/^\d+$/.test(id)) {
    return [];
  }

  const pageUrl =
    `https://music.bugs.co.kr/album/${id}`;

  console.log(
    "Bugs 앨범 페이지:",
    pageUrl
  );

  try {
    const response = await fetchWithTimeout(
      pageUrl,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language":
            "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          Referer:
            "https://music.bugs.co.kr/",
        },
      },
      10000
    );

    if (!response.ok) {
      console.log(
        "Bugs 앨범 페이지 오류:",
        response.status
      );

      return [];
    }

    const html = await response.text();

    const urls = new Set<string>();

    // -------------------------------------------------
    // og:image / img src / lazy image
    // -------------------------------------------------
    const attributeRegex =
      /(?:src|data-src|data-original|data-lazy-src|data-image|content)=["']([^"']+)["']/gi;

    let match: RegExpExecArray | null;

    while (
      (match = attributeRegex.exec(html)) !== null
    ) {
      const url = normalizeImageUrl(
        match[1],
        pageUrl
      );

      if (
        url &&
        isValidBugsImageUrl(url)
      ) {
        urls.add(url);
      }
    }

    // -------------------------------------------------
    // srcset
    // -------------------------------------------------
    const srcsetRegex =
      /(?:srcset|data-srcset)=["']([^"']+)["']/gi;

    while (
      (match = srcsetRegex.exec(html)) !== null
    ) {
      for (
        const part of match[1].split(",")
      ) {
        const urlPart =
          part.trim().split(/\s+/)[0];

        const url = normalizeImageUrl(
          urlPart,
          pageUrl
        );

        if (
          url &&
          isValidBugsImageUrl(url)
        ) {
          urls.add(url);
        }
      }
    }

    // -------------------------------------------------
    // HTML 내부 직접 URL
    // -------------------------------------------------
    const directRegex =
      /https?:\/\/image\.bugsm\.co\.kr\/album\/images\/[^"'<> )]+/gi;

    while (
      (match = directRegex.exec(html)) !== null
    ) {
      const url = match[0]
        .replace(/&amp;/g, "&")
        .replace(/[),;]+$/g, "");

      if (isValidBugsImageUrl(url)) {
        urls.add(url);
      }
    }

    // -------------------------------------------------
    // og:image가 content 뒤에 있는 경우도 처리
    // -------------------------------------------------
    const ogImageRegex =
      /<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/gi;

    while (
      (match = ogImageRegex.exec(html)) !== null
    ) {
      const url = normalizeImageUrl(
        match[1],
        pageUrl
      );

      if (
        url &&
        isValidBugsImageUrl(url)
      ) {
        urls.add(url);
      }
    }

    const ogImageReverseRegex =
      /<meta\b[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/gi;

    while (
      (match =
        ogImageReverseRegex.exec(html)) !== null
    ) {
      const url = normalizeImageUrl(
        match[1],
        pageUrl
      );

      if (
        url &&
        isValidBugsImageUrl(url)
      ) {
        urls.add(url);
      }
    }

    const result = Array.from(urls).sort(
      (a, b) => {
        function score(url: string) {
          let value = 0;

          if (url.includes("/1000/")) {
            value += 100;
          }

          if (url.includes("/500/")) {
            value += 80;
          }

          if (url.includes("/300/")) {
            value += 60;
          }

          if (url.includes("/200/")) {
            value += 40;
          }

          if (url.includes("/100/")) {
            value += 20;
          }

          if (
            url.includes(`/${id}.jpg`)
          ) {
            value += 30;
          }

          return value;
        }

        return score(b) - score(a);
      }
    );

    console.log(
      "Bugs 앨범 이미지 후보:",
      result.slice(0, 10)
    );

    return result;
  } catch (error) {
    console.log(
      "Bugs 앨범 페이지 스크랩 오류:",
      error
    );

    return [];
  }
}

// =====================================================
// Bugs fallback URL
// =====================================================
function makeBugsFallbackUrls(
  albumId: string | number
) {
  const id = String(albumId).trim();

  if (!/^\d+$/.test(id)) {
    return [];
  }

  const folders = new Set<string>();

  if (id.length > 2) {
    folders.add(id.slice(0, -2));
  }

  if (id.length >= 6) {
    folders.add(id.slice(0, 6));
  }

  if (id.length > 1) {
    folders.add(id.slice(0, -1));
  }

  folders.add(id);

  const sizes = [
    "1000",
    "500",
    "300",
    "200",
    "100",
  ];

  const urls: string[] = [];

  for (const folder of folders) {
    for (const size of sizes) {
      urls.push(
        `https://image.bugsm.co.kr/album/images/${size}/${folder}/${id}.jpg`
      );
    }
  }

  return [...new Set(urls)];
}

// =====================================================
// Bugs 검색
// =====================================================
async function searchBugs(
  title: string,
  artist: string
) {
  try {
    const query = encodeURIComponent(
      `${title} ${artist}`
    );

    const url =
      "https://m.bugs.co.kr/api/getSearchList" +
      "?type=track" +
      "&query=" +
      query +
      "&page=1" +
      "&size=50";

    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0",
          Accept:
            "application/json,text/plain,*/*",
        },
      },
      6000
    );

    if (!response.ok) {
      console.log(
        "Bugs 검색 오류:",
        response.status
      );

      return null;
    }

    const json = await response.json();

    if (
      !json ||
      !Array.isArray(json.list)
    ) {
      return null;
    }

    const results: any[] = [];

    for (const item of json.list) {
      const trackTitle =
        item.track_title || "";

      const albumTitle =
        item.album?.title || "";

      let artists = "";

      if (Array.isArray(item.artists)) {
        artists = item.artists
          .map(
            (artistItem: any) =>
              artistItem?.artist_nm ||
              artistItem?.name ||
              ""
          )
          .filter(Boolean)
          .join(" ");
      } else if (
        typeof item.artists === "string"
      ) {
        artists = item.artists;
      }

      if (!trackTitle) {
        continue;
      }

      const titleScore = similarity(
        title,
        trackTitle
      );

      const artistScore = artist
        ? similarity(
            artist,
            artists
          )
        : 0;

      const exactTitle =
        normalizeCompact(title) ===
        normalizeCompact(trackTitle);

      const compactTitleMatch =
        titleMatches(
          title,
          trackTitle
        );

      let score =
        titleScore * 0.7 +
        artistScore * 0.2 +
        similarity(
          title,
          albumTitle
        ) * 0.1;

      if (exactTitle) {
        score += 0.4;
      }

      if (compactTitleMatch) {
        score += 0.25;
      }

      if (
        artist &&
        artists &&
        normalizeCompact(artist) ===
          normalizeCompact(artists)
      ) {
        score += 0.3;
      }

      results.push({
        item,
        trackTitle,
        albumTitle,
        artists,
        score,
        exactTitle,
        compactTitleMatch,
        titleScore,
      });
    }

    results.sort(
      (a, b) => b.score - a.score
    );

    if (results.length === 0) {
      return null;
    }

    // 제목 + 가수 정확 일치 우선
    let best = results.find(
      (item) =>
        item.exactTitle &&
        artist &&
        item.artists &&
        normalizeCompact(
          item.artists
        ) ===
          normalizeCompact(artist)
    );

    // 제목 정확 일치
    if (!best) {
      best = results.find(
        (item) => item.exactTitle
      );
    }

    // 제목 포함
    if (!best) {
      best = results.find(
        (item) =>
          item.compactTitleMatch &&
          item.titleScore >= 0.75
      );
    }

    if (!best) {
      best = results[0];
    }

    if (!best) {
      return null;
    }

    console.log(
      "Bugs 최종 후보:",
      title,
      "/",
      artist,
      "→",
      best.trackTitle,
      "/",
      best.artists,
      "점수:",
      best.score
    );

    if (
      !best.compactTitleMatch &&
      best.titleScore < 0.55
    ) {
      return null;
    }

    const albumId =
      best.item?.album?.album_id;

    console.log(
      "Bugs 앨범 ID:",
      albumId
    );

    // =================================================
    // 1. API가 직접 준 이미지
    // =================================================
    const apiImages =
      extractBugsImageUrls(best.item);

    const uniqueImages = Array.from(
      new Map(
        apiImages.map((item) => [
          item.url,
          item,
        ])
      ).values()
    ).sort(
      (a, b) =>
        b.priority - a.priority
    );

    for (
      const candidate of uniqueImages.slice(
        0,
        10
      )
    ) {
      if (
        isValidBugsImageUrl(
          candidate.url
        ) &&
        (await checkImage(
          candidate.url
        ))
      ) {
        console.log(
          "Bugs API 커버 발견:",
          candidate.url
        );

        return candidate.url;
      }
    }

    // =================================================
    // 2. 실제 Bugs 앨범 페이지
    // =================================================
    if (albumId) {
      const albumImages =
        await extractBugsAlbumPageImages(
          albumId
        );

      for (
        const imageUrl of albumImages.slice(
          0,
          10
        )
      ) {
        console.log(
          "Bugs 앨범 페이지 이미지 확인:",
          imageUrl
        );

        if (
          await checkImage(imageUrl)
        ) {
          console.log(
            "Bugs 앨범 페이지 커버 발견:",
            imageUrl
          );

          return imageUrl;
        }
      }
    }

    // =================================================
    // 3. URL fallback
    // =================================================
    if (albumId) {
      const fallbackUrls =
        makeBugsFallbackUrls(
          albumId
        );

      for (
        const imageUrl of fallbackUrls
      ) {
        if (
          await checkImage(imageUrl)
        ) {
          console.log(
            "Bugs fallback 커버 발견:",
            imageUrl
          );

          return imageUrl;
        }
      }
    }

    return null;
  } catch (error) {
    console.error(
      "Bugs 검색 오류:",
      error
    );

    return null;
  }
}

// =====================================================
// YouTube 검색
// =====================================================
async function searchYouTube(
  title: string,
  artist: string
) {
  try {
    const apiKey =
      process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      console.error(
        "YOUTUBE_API_KEY가 없습니다."
      );

      return null;
    }

    const query = encodeURIComponent(
      `${title} ${artist} official MV`
    );

    const url =
      "https://www.googleapis.com/youtube/v3/search" +
      "?part=snippet" +
      "&q=" +
      query +
      "&type=video" +
      "&maxResults=5" +
      "&regionCode=KR" +
      "&relevanceLanguage=ko" +
      "&key=" +
      apiKey;

    const response =
      await fetchWithTimeout(
        url,
        {},
        6000
      );

    if (!response.ok) {
      console.error(
        "YouTube 검색 HTTP 오류:",
        response.status
      );

      return null;
    }

    const json =
      await response.json();

    if (
      !Array.isArray(json.items)
    ) {
      return null;
    }

    let best: any = null;
    let bestScore = 0;

    const badWords = [
      "reaction",
      "리액션",
      "cover",
      "커버",
      "직캠",
      "fancam",
      "1시간",
      "playlist",
      "플레이리스트",
      "mix",
      "remix",
      "리믹스",
    ];

    for (const item of json.items) {
      const snippet = item.snippet;

      if (!snippet) {
        continue;
      }

      const videoTitle =
        snippet.title || "";

      const channelTitle =
        snippet.channelTitle || "";

      let score =
        similarity(
          title,
          videoTitle
        ) * 0.65 +
        similarity(
          artist,
          videoTitle
        ) * 0.2 +
        similarity(
          artist,
          channelTitle
        ) * 0.15;

      const lowerTitle =
        videoTitle.toLowerCase();

      if (
        lowerTitle.includes("official") ||
        lowerTitle.includes("뮤직비디오") ||
        lowerTitle.includes("music video") ||
        lowerTitle.includes("mv")
      ) {
        score += 0.25;
      }

      for (
        const badWord of badWords
      ) {
        if (
          lowerTitle.includes(
            badWord.toLowerCase()
          )
        ) {
          score -= 0.25;
        }
      }

      if (
        titleMatches(
          title,
          videoTitle
        )
      ) {
        score += 0.2;
      }

      if (
        score > bestScore
      ) {
        bestScore = score;
        best = item;
      }
    }

    if (
      !best ||
      bestScore < 0.35
    ) {
      return null;
    }

    const thumbnails =
      best.snippet?.thumbnails;

    if (!thumbnails) {
      return null;
    }

    return (
      thumbnails.maxres?.url ||
      thumbnails.standard?.url ||
      thumbnails.high?.url ||
      thumbnails.medium?.url ||
      thumbnails.default?.url ||
      null
    );
  } catch (error) {
    console.error(
      "YouTube 검색 오류:",
      error
    );

    return null;
  }
}

// =====================================================
// 커버 검색
//
// Bugs → YouTube
// =====================================================
async function findCover(
  title: string,
  artist: string
) {
  console.log(
    "========================================"
  );

  console.log(
    "커버 검색:",
    title,
    "/",
    artist
  );

  // 1. Bugs
  console.log(
    "1️⃣ Bugs 검색"
  );

  const bugs = await searchBugs(
    title,
    artist
  );

  if (bugs) {
    console.log(
      "✅ Bugs 커버 확정:",
      bugs
    );

    return {
      coverUrl: bugs,
      source: "bugs",
    };
  }

  // 2. YouTube
  console.log(
    "2️⃣ Bugs 실패 → YouTube"
  );

  const youtube =
    await searchYouTube(
      title,
      artist
    );

  if (youtube) {
    console.log(
      "✅ YouTube 커버 확정:",
      youtube
    );

    return {
      coverUrl: youtube,
      source: "youtube",
    };
  }

  console.log(
    "❌ 커버를 찾지 못함"
  );

  return {
    coverUrl: null,
    source: null,
  };
}

// =====================================================
// 노래 추가
// =====================================================
export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const {
      title,
      artist,
      level,
      category,
      difficulty,
    } = body;

    if (!title || !artist) {
      return NextResponse.json(
        {
          error:
            "제목과 가수는 필수입니다.",
        },
        {
          status: 400,
        }
      );
    }

    const admin =
      await isAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          error:
            "관리자 권한이 필요합니다.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from("songs")
        .insert({
          title,
          artist,
          level:
            level || "완곡",
          category:
            category || "K-POP",
          difficulty:
            difficulty === "" ||
            difficulty === null ||
            difficulty === undefined
              ? null
              : Number(
                  difficulty
                ),
        })
        .select()
        .single();

    if (error) {
      console.error(
        "노래 추가 오류:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    try {
      const cover =
        await findCover(
          title,
          artist
        );

      if (cover.coverUrl) {
        const {
          data: updatedSong,
          error:
            coverError,
        } =
          await supabaseAdmin
            .from("songs")
            .update({
              cover_url:
                cover.coverUrl,
            })
            .eq(
              "id",
              data.id
            )
            .select()
            .maybeSingle();

        if (coverError) {
          console.error(
            "커버 저장 오류:",
            coverError
          );
        }

        if (updatedSong) {
          return NextResponse.json({
            song:
              updatedSong,
            coverSource:
              cover.source,
          });
        }
      }
    } catch (error) {
      console.error(
        "커버 검색 실패:",
        error
      );
    }

    return NextResponse.json({
      song: data,
      coverSource: null,
    });
  } catch (error) {
    console.error(
      "노래 추가 서버 오류:",
      error
    );

    return NextResponse.json(
      {
        error:
          "서버 오류가 발생했습니다.",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// 특정 노래 조회
// =====================================================
async function getSong(id: string) {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("songs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

  if (error) {
    console.error(
      "노래 조회 오류:",
      error
    );

    return null;
  }

  return data;
}

// =====================================================
// 노래 수정 / 커버만 삭제
// =====================================================
export async function PATCH(
  request: Request
) {
  try {
    const body =
      await request.json();

    const {
      id,
      title,
      artist,
      level,
      category,
      difficulty,
      clearCover,
    } = body;

    if (!id) {
      return NextResponse.json(
        {
          error:
            "노래 ID가 없습니다.",
        },
        {
          status: 400,
        }
      );
    }

    const admin =
      await isAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          error:
            "관리자 권한이 필요합니다.",
        },
        {
          status: 403,
        }
      );
    }

    const existingSong =
      await getSong(id);

    if (!existingSong) {
      return NextResponse.json(
        {
          error:
            "노래를 찾을 수 없습니다.",
        },
        {
          status: 404,
        }
      );
    }

    const titleChanged =
      title !== undefined &&
      title !== existingSong.title;

    const artistChanged =
      artist !== undefined &&
      artist !== existingSong.artist;

    const updateData: any = {};

    if (title !== undefined) {
      updateData.title = title;
    }

    if (artist !== undefined) {
      updateData.artist = artist;
    }

    if (level !== undefined) {
      updateData.level = level;
    }

    if (category !== undefined) {
      updateData.category = category;
    }

    if (difficulty !== undefined) {
      updateData.difficulty =
        difficulty === "" ||
        difficulty === null
          ? null
          : Number(difficulty);
    }

    // 커버만 삭제
    if (clearCover === true) {
      updateData.cover_url = null;
    }

    // 제목/가수 변경 시 새 커버 검색
    else if (
      titleChanged ||
      artistChanged
    ) {
      const newTitle =
        title !== undefined
          ? title
          : existingSong.title;

      const newArtist =
        artist !== undefined
          ? artist
          : existingSong.artist;

      try {
        const cover =
          await findCover(
            newTitle,
            newArtist
          );

        if (cover.coverUrl) {
          updateData.cover_url =
            cover.coverUrl;
        } else {
          updateData.cover_url =
            null;
        }
      } catch (error) {
        console.error(
          "수정 중 커버 검색 실패:",
          error
        );
      }
    }

    if (
      Object.keys(updateData)
        .length === 0
    ) {
      return NextResponse.json({
        success: true,
        song: existingSong,
      });
    }

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from("songs")
        .update(updateData)
        .eq("id", id)
        .select("*")
        .maybeSingle();

    if (error) {
      console.error(
        "노래 수정 오류:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          error:
            "수정된 노래를 찾을 수 없습니다.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,
      song: data,
    });
  } catch (error) {
    console.error(
      "PATCH 서버 오류:",
      error
    );

    return NextResponse.json(
      {
        error:
          "서버 오류가 발생했습니다.",
      },
      {
        status: 500,
      }
    );
  }
}

// =====================================================
// 노래 삭제
// =====================================================
export async function DELETE(
  request: Request
) {
  try {
    const {
      searchParams,
    } = new URL(request.url);

    const id =
      searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          error:
            "노래 ID가 없습니다.",
        },
        {
          status: 400,
        }
      );
    }

    const admin =
      await isAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          error:
            "관리자 권한이 필요합니다.",
        },
        {
          status: 403,
        }
      );
    }

    const { error } =
      await supabaseAdmin
        .from("songs")
        .delete()
        .eq("id", id);

    if (error) {
      console.error(
        "노래 삭제 오류:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE 서버 오류:",
      error
    );

    return NextResponse.json(
      {
        error:
          "서버 오류가 발생했습니다.",
      },
      {
        status: 500,
      }
    );
  }
}