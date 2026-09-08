import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

/* =========================================================
   공통
========================================================= */

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 10000
) {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

function normalize(text: string) {
  return String(text || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompact(text: string) {
  return normalize(text).replace(/\s/g, "");
}

function similarity(a: string, b: string) {
  const aa = normalizeCompact(a);
  const bb = normalizeCompact(b);

  if (!aa || !bb) return 0;

  if (aa === bb) return 1;

  if (aa.includes(bb) || bb.includes(aa)) {
    return 0.85;
  }

  const shorter =
    aa.length < bb.length ? aa : bb;

  const longer =
    aa.length < bb.length ? bb : aa;

  let same = 0;

  for (const char of shorter) {
    if (longer.includes(char)) {
      same++;
    }
  }

  return same / longer.length;
}

/* =========================================================
   이미지 URL
========================================================= */

function normalizeImageUrl(
  url: string,
  baseUrl = "https://music.bugs.co.kr/"
) {
  if (!url) return null;

  let value = String(url).trim();

  value = value
    .replace(/^["']|["']$/g, "")
    .trim();

  if (value.startsWith("//")) {
    value = "https:" + value;
  }

  if (value.startsWith("/")) {
    try {
      value = new URL(
        value,
        baseUrl
      ).href;
    } catch {
      return null;
    }
  }

  if (!/^https?:\/\//i.test(value)) {
    return null;
  }

  const lower = value.toLowerCase();

  if (
    lower.includes("logo") ||
    lower.includes("loading") ||
    lower.includes("placeholder") ||
    lower.includes("default") ||
    lower.includes("icon")
  ) {
    return null;
  }

  return value;
}

/* =========================================================
   이미지 확인
========================================================= */

async function checkImage(url: string) {
  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
          Referer:
            "https://music.bugs.co.kr/",
        },
      },
      7000
    );

    if (!response.ok) {
      console.log(
        "이미지 HTTP 오류:",
        response.status,
        url
      );

      return false;
    }

    const contentType =
      response.headers.get(
        "content-type"
      ) || "";

    if (
      contentType.startsWith("image/")
    ) {
      return true;
    }

    console.log(
      "이미지가 아님:",
      contentType,
      url
    );

    return false;
  } catch (error) {
    console.log(
      "이미지 확인 오류:",
      url,
      error
    );

    return false;
  }
}

/* =========================================================
   Bugs 앨범 페이지에서 실제 커버 URL 찾기
========================================================= */

async function getBugsAlbumImages(
  albumId: string
) {
  const pageUrl =
    `https://music.bugs.co.kr/album/${albumId}`;

  console.log(
    "Bugs 앨범 페이지 확인:",
    pageUrl
  );

  try {
    const response =
      await fetchWithTimeout(
        pageUrl,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            Referer:
              "https://music.bugs.co.kr/",
          },
        },
        12000
      );

    if (!response.ok) {
      console.log(
        "Bugs 앨범 페이지 HTTP 오류:",
        response.status
      );

      return [];
    }

    const html =
      await response.text();

    const urls = new Set<string>();

    /* -----------------------------------------------------
       img src / data-src
    ----------------------------------------------------- */

    const imgRegex =
      /<(?:img|source)[^>]+?(?:src|data-src|data-original|data-lazy-src|data-image)=["']([^"']+)["']/gi;

    let match: RegExpExecArray | null;

    while (
      (match = imgRegex.exec(html)) !== null
    ) {
      const url =
        normalizeImageUrl(
          match[1],
          pageUrl
        );

      if (
        url &&
        url.includes(
          "image.bugsm.co.kr"
        )
      ) {
        urls.add(url);
      }
    }

    /* -----------------------------------------------------
       OG IMAGE

       property="og:image" content="..."
       또는
       content="..." property="og:image"
    ----------------------------------------------------- */

    const ogRegex1 =
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi;

    while (
      (match = ogRegex1.exec(html)) !== null
    ) {
      const url =
        normalizeImageUrl(
          match[1],
          pageUrl
        );

      if (
        url &&
        url.includes(
          "image.bugsm.co.kr"
        )
      ) {
        urls.add(url);
      }
    }

    const ogRegex2 =
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/gi;

    while (
      (match = ogRegex2.exec(html)) !== null
    ) {
      const url =
        normalizeImageUrl(
          match[1],
          pageUrl
        );

      if (
        url &&
        url.includes(
          "image.bugsm.co.kr"
        )
      ) {
        urls.add(url);
      }
    }

    /* -----------------------------------------------------
       srcset
    ----------------------------------------------------- */

    const srcsetRegex =
      /(?:srcset|data-srcset)=["']([^"']+)["']/gi;

    while (
      (match =
        srcsetRegex.exec(html)) !== null
    ) {
      const parts =
        match[1].split(",");

      for (const part of parts) {
        const urlPart =
          part
            .trim()
            .split(/\s+/)[0];

        const url =
          normalizeImageUrl(
            urlPart,
            pageUrl
          );

        if (
          url &&
          url.includes(
            "image.bugsm.co.kr"
          )
        ) {
          urls.add(url);
        }
      }
    }

    /* -----------------------------------------------------
       HTML에 직접 들어있는 Bugs 이미지
    ----------------------------------------------------- */

    const directRegex =
      /https?:\/\/image\.bugsm\.co\.kr\/album\/images\/[^"'<> )]+/gi;

    while (
      (match =
        directRegex.exec(html)) !== null
    ) {
      const url = match[0]
        .replace(
          /&amp;/g,
          "&"
        )
        .replace(
          /[),;]+$/g,
          ""
        );

      if (url) {
        urls.add(url);
      }
    }

    const result =
      Array.from(urls)
        .filter((url) => {
          const lower =
            url.toLowerCase();

          return (
            !lower.includes("logo") &&
            !lower.includes("icon") &&
            !lower.includes("loading") &&
            !lower.includes("default")
          );
        })
        .sort((a, b) => {
          const score = (
            url: string
          ) => {
            let value = 0;

            if (
              url.includes(
                "/1000/"
              )
            ) {
              value += 100;
            }

            if (
              url.includes(
                "/500/"
              )
            ) {
              value += 80;
            }

            if (
              url.includes(
                "/300/"
              )
            ) {
              value += 60;
            }

            if (
              url.includes(
                "/200/"
              )
            ) {
              value += 40;
            }

            if (
              url.includes(
                "/100/"
              )
            ) {
              value += 20;
            }

            return value;
          };

          return (
            score(b) -
            score(a)
          );
        });

    console.log(
      "Bugs 앨범 이미지 후보:",
      result.slice(0, 10)
    );

    return result;
  } catch (error) {
    console.log(
      "Bugs 앨범 페이지 오류:",
      error
    );

    return [];
  }
}

/* =========================================================
   Bugs 검색
========================================================= */

async function searchBugs(
  title: string,
  artist: string
) {
  try {
    const query =
      encodeURIComponent(
        `${title} ${artist}`
      );

    const searchUrl =
      `https://music.bugs.co.kr/search/track?q=${query}`;

    console.log(
      "Bugs 검색:",
      searchUrl
    );

    const response =
      await fetchWithTimeout(
        searchUrl,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
            Referer:
              "https://music.bugs.co.kr/",
          },
        },
        12000
      );

    if (!response.ok) {
      console.log(
        "Bugs 검색 실패:",
        response.status
      );

      return null;
    }

    const html =
      await response.text();

    const titleNorm =
      normalizeCompact(title);

    const artistNorm =
      normalizeCompact(artist);

    /* -----------------------------------------------------
       앨범 ID 추출
    ----------------------------------------------------- */

    const albumIds =
      new Set<string>();

    const albumRegex =
      /(?:href|data-href)=["'](?:https?:\/\/music\.bugs\.co\.kr)?\/album\/(\d+)["']/gi;

    let match: RegExpExecArray | null;

    while (
      (match =
        albumRegex.exec(html)) !== null
    ) {
      albumIds.add(match[1]);
    }

    /* -----------------------------------------------------
       이미지 URL도 직접 확인
    ----------------------------------------------------- */

    const directImages =
      [
        ...html.matchAll(
          /https?:\/\/image\.bugsm\.co\.kr\/album\/images\/[^"'<> )]+/gi
        ),
      ].map(
        (item) =>
          item[0]
      );

    /* -----------------------------------------------------
       검색 결과 주변 텍스트로 점수 계산
    ----------------------------------------------------- */

    const blocks =
      html.split(
        /<\/tr>|<\/li>|<\/article>/i
      );

    const scoredAlbums: {
      id: string;
      score: number;
    }[] = [];

    for (const block of blocks) {
      const idMatch =
        block.match(
          /\/album\/(\d+)/i
        );

      if (!idMatch) {
        continue;
      }

      const id =
        idMatch[1];

      const text =
        block
          .replace(
            /<[^>]+>/g,
            " "
          )
          .replace(
            /\s+/g,
            " "
          )
          .trim();

      const compact =
        normalizeCompact(
          text
        );

      let score = 0;

      if (
        compact.includes(
          titleNorm
        )
      ) {
        score += 10;
      }

      if (
        compact.includes(
          artistNorm
        )
      ) {
        score += 8;
      }

      if (
        compact ===
        titleNorm
      ) {
        score += 5;
      }

      if (score > 0) {
        scoredAlbums.push({
          id,
          score,
        });
      }
    }

    /* -----------------------------------------------------
       중복 제거 + 점수순
    ----------------------------------------------------- */

    const rankedIds =
      Array.from(
        new Set([
          ...scoredAlbums
            .sort(
              (a, b) =>
                b.score -
                a.score
            )
            .map(
              (item) =>
                item.id
            ),
          ...Array.from(
            albumIds
          ),
        ])
      ).slice(0, 10);

    console.log(
      "Bugs 앨범 후보:",
      rankedIds
    );

    /* -----------------------------------------------------
       앨범 페이지 확인
    ----------------------------------------------------- */

    for (const albumId of rankedIds) {
      try {
        const albumUrl =
          `https://music.bugs.co.kr/album/${albumId}`;

        const albumResponse =
          await fetchWithTimeout(
            albumUrl,
            {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
                Referer:
                  "https://music.bugs.co.kr/",
              },
            },
            10000
          );

        if (
          !albumResponse.ok
        ) {
          continue;
        }

        const albumHtml =
          await albumResponse.text();

        const albumText =
          albumHtml
            .replace(
              /<[^>]+>/g,
              " "
            )
            .replace(
              /\s+/g,
              " "
            );

        const titleScore =
          similarity(
            albumText,
            title
          );

        const artistScore =
          similarity(
            albumText,
            artist
          );

        const combinedScore =
          titleScore * 0.65 +
          artistScore * 0.35;

        console.log(
          "Bugs 후보 확인:",
          albumId,
          combinedScore
        );

        /*
          앨범 페이지 안에서 실제 이미지 찾기
        */

        const images =
          await getBugsAlbumImages(
            albumId
          );

        for (const imageUrl of images) {
          console.log(
            "Bugs 이미지 후보:",
            imageUrl
          );

          if (
            await checkImage(
              imageUrl
            )
          ) {
            console.log(
              "Bugs 커버 발견:",
              imageUrl
            );

            return {
              url: imageUrl,
              source: "bugs",
            };
          }
        }

        /*
          검색 HTML에서 발견한 이미지
        */

        for (const imageUrl of directImages) {
          if (
            await checkImage(
              imageUrl
            )
          ) {
            console.log(
              "Bugs 검색 이미지 발견:",
              imageUrl
            );

            return {
              url: imageUrl,
              source: "bugs",
            };
          }
        }
      } catch (error) {
        console.log(
          "Bugs 앨범 확인 오류:",
          albumId,
          error
        );
      }
    }

    return null;
  } catch (error) {
    console.log(
      "Bugs 검색 오류:",
      error
    );

    return null;
  }
}

/* =========================================================
   YouTube
========================================================= */

async function searchYouTube(
  title: string,
  artist: string
) {
const youtubeKeys = [
  process.env.YOUTUBE_API_KEY,
  process.env.YOUTUBE_API_KEY_2,
].filter(Boolean) as string[];
  if (!apiKey) {
    console.log(
      "YOUTUBE_API_KEY 없음"
    );

    return {
      limited: true,
    };
  }

  try {
    const query =
      encodeURIComponent(
        `${title} ${artist} official MV`
      );

    const url =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${query}&key=${apiKey}`;

    const response =
      await fetchWithTimeout(
        url,
        {},
        10000
      );

    if (
      response.status === 403
    ) {
      console.log(
        "YouTube API 사용량 제한"
      );

      return {
        limited: true,
      };
    }

    if (
      !response.ok
    ) {
      console.log(
        "YouTube 검색 실패:",
        response.status
      );

      return null;
    }

    const data =
      await response.json();

    const items =
      Array.isArray(
        data.items
      )
        ? data.items
        : [];

    const titleNorm =
      normalizeCompact(title);

    const artistNorm =
      normalizeCompact(artist);

    const candidates =
      items
        .map((item: any) => {
          const videoTitle =
            item?.snippet
              ?.title || "";

          const channel =
            item?.snippet
              ?.channelTitle || "";

          const text =
            normalizeCompact(
              `${videoTitle} ${channel}`
            );

          let score = 0;

          if (
            text.includes(
              titleNorm
            )
          ) {
            score += 10;
          }

          if (
            text.includes(
              artistNorm
            )
          ) {
            score += 8;
          }

          const badWords = [
            "reaction",
            "리액션",
            "cover",
            "커버",
            "karaoke",
            "노래방",
            "fancam",
            "직캠",
            "live",
            "라이브",
            "shorts",
            "short",
          ];

          for (const word of badWords) {
            if (
              text.includes(
                normalizeCompact(
                  word
                )
              )
            ) {
              score -= 6;
            }
          }

          return {
            item,
            score,
          };
        })
        .sort(
          (a: any, b: any) =>
            b.score -
            a.score
        );

    const best =
      candidates[0];

    if (!best) {
      return null;
    }

    const thumbnails =
      best.item?.snippet
        ?.thumbnails;

    const thumbnail =
      thumbnails?.maxres?.url ||
      thumbnails?.standard?.url ||
      thumbnails?.high?.url ||
      thumbnails?.medium?.url ||
      thumbnails?.default?.url;

    if (!thumbnail) {
      return null;
    }

    console.log(
      "YouTube 커버 발견:",
      thumbnail
    );

    return {
      url: thumbnail,
      source: "youtube",
    };
  } catch (error) {
    console.log(
      "YouTube 검색 오류:",
      error
    );

    return null;
  }
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: Request
) {
  try {
    /* 관리자 확인 */

    if (!isAdmin()) {
      return NextResponse.json(
        {
          status: "unauthorized",
          message:
            "관리자 권한이 필요합니다.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const songId =
      Number(body?.songId);

    if (
      !songId ||
      Number.isNaN(songId)
    ) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "songId가 필요합니다.",
        },
        {
          status: 400,
        }
      );
    }

    /* 노래 조회 */

    const {
      data: song,
      error: songError,
    } =
      await supabaseAdmin
        .from("songs")
        .select(
          "id,title,artist,cover_url"
        )
        .eq(
          "id",
          songId
        )
        .single();

    if (
      songError ||
      !song
    ) {
      console.log(
        "노래 조회 실패:",
        songError
      );

      return NextResponse.json(
        {
          status: "error",
          message:
            "노래를 찾을 수 없습니다.",
        },
        {
          status: 404,
        }
      );
    }

    /* 이미 커버가 있으면 건너뜀 */

    if (song.cover_url) {
      return NextResponse.json({
        status: "already_exists",
        coverUrl:
          song.cover_url,
      });
    }

    console.log(
      "커버 검색 시작:",
      song.title,
      "/",
      song.artist
    );

    /* =====================================================
       1. Bugs
    ===================================================== */

    const bugsResult =
      await searchBugs(
        song.title,
        song.artist
      );

    if (
      bugsResult?.url
    ) {
      const {
        error: updateError,
      } =
        await supabaseAdmin
          .from("songs")
          .update({
            cover_url:
              bugsResult.url,
          })
          .eq(
            "id",
            songId
          );

      if (
        updateError
      ) {
        console.log(
          "Bugs 커버 DB 저장 실패:",
          updateError
        );

        return NextResponse.json(
          {
            status: "error",
            message:
              "커버는 찾았지만 DB 저장에 실패했습니다.",
          },
          {
            status: 500,
          }
        );
      }

      console.log(
        "Bugs 커버 저장 완료:",
        song.title
      );

      return NextResponse.json({
        status: "updated",
        coverUrl:
          bugsResult.url,
        source: "bugs",
      });
    }

    console.log(
      "Bugs 커버를 찾지 못함:",
      song.id,
      song.title,
      song.artist
    );

    /* =====================================================
       2. YouTube
    ===================================================== */

    const youtubeResult =
      await searchYouTube(
        song.title,
        song.artist
      );

    if (
      youtubeResult?.limited
    ) {
      return NextResponse.json({
        status:
          "youtube_limited",
        message:
          "YouTube API 사용량 제한이 발생했습니다.",
      });
    }

    if (
      youtubeResult?.url
    ) {
      const {
        error: updateError,
      } =
        await supabaseAdmin
          .from("songs")
          .update({
            cover_url:
              youtubeResult.url,
          })
          .eq(
            "id",
            songId
          );

      if (
        updateError
      ) {
        console.log(
          "YouTube 커버 DB 저장 실패:",
          updateError
        );

        return NextResponse.json(
          {
            status: "error",
            message:
              "커버는 찾았지만 DB 저장에 실패했습니다.",
          },
          {
            status: 500,
          }
        );
      }

      console.log(
        "YouTube 커버 저장 완료:",
        song.title
      );

      return NextResponse.json({
        status: "updated",
        coverUrl:
          youtubeResult.url,
        source: "youtube",
      });
    }

    /* =====================================================
       못 찾음
    ===================================================== */

    return NextResponse.json({
      status: "not_found",
      message:
        "Bugs와 YouTube에서 커버를 찾지 못했습니다.",
    });
  } catch (error) {
    console.error(
      "커버 API 전체 오류:",
      error
    );

    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "커버 검색 중 서버 오류가 발생했습니다.",
      },
      {
        status: 500,
      }
    );
  }
}