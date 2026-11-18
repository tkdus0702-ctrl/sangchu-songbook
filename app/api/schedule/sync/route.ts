
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const SOOP_ID = "hiyam2411";
const SOOP_API = `https://api-channel.sooplive.com/v1.3/channel/${SOOP_ID}/vod/review`;

// 예정 시간과 추정 방송 시작 시간의 허용 차이: 3시간
const MATCH_LIMIT_MINUTES = 180;

type SoopVod = {
  titleNo: number;
  titleName?: string;
  regDate?: string;
  ucc?: {
    thumb?: string;
    totalFileDuration?: number;
    fileType?: string;
  };
};

type SoopResponse = {
  contents?: SoopVod[];
  meta?: {
    totalPages?: number;
    totalItems?: number;
  };
};

type VodRow = {
  status: "completed";
  title: string | null;
  stream_date: string;
  duration_minutes: number | null;
  vod_id: string;
  estimated_time: string | null;
  estimated_timestamp: number | null;
};

type ExistingSchedule = {
  id: number;
  status: "scheduled" | "completed" | "off";
  title: string | null;
  stream_date: string;
  scheduled_time: string | null;
  vod_id: string | null;
  is_manually_edited: boolean;
};

function getStreamDate(vod: SoopVod) {
  const rowKeyDate = vod.ucc?.thumb?.match(/rowKey=(\d{8})_/)?.[1];

  if (rowKeyDate) {
    return `${rowKeyDate.slice(0, 4)}-${rowKeyDate.slice(4, 6)}-${rowKeyDate.slice(6, 8)}`;
  }

  return vod.regDate?.slice(0, 10) ?? null;
}

// SOOP 등록 시각에서 방송 길이를 빼서 시작 시각을 추정
function getEstimatedStart(vod: SoopVod) {
  if (!vod.regDate || typeof vod.ucc?.totalFileDuration !== "number") {
    return null;
  }

  const registeredAt = new Date(
    vod.regDate.replace(" ", "T") + "+09:00"
  );

  if (Number.isNaN(registeredAt.getTime())) {
    return null;
  }

  const startTimestamp =
    registeredAt.getTime() - vod.ucc.totalFileDuration;

  const startDate = new Date(startTimestamp);

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(startDate);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
    timestamp: startTimestamp,
  };
}

function getTodayInKorea() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getTimeDifference(
  estimatedTime: string,
  scheduledTime: string
) {
  const [estimatedHour, estimatedMinute] = estimatedTime
    .slice(0, 5)
    .split(":")
    .map(Number);

  const [scheduledHour, scheduledMinute] = scheduledTime
    .slice(0, 5)
    .split(":")
    .map(Number);

  return Math.abs(
    estimatedHour * 60 +
      estimatedMinute -
      (scheduledHour * 60 + scheduledMinute)
  );
}

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { success: false, message: "관리자 권한이 필요합니다." },
      { status: 401 }
    );
  }

  try {
    const endDate = getTodayInKorea();
    const allVods: SoopVod[] = [];

    const firstUrl = new URL(SOOP_API);
    firstUrl.searchParams.set("startDate", "2020-01-01");
    firstUrl.searchParams.set("endDate", endDate);
    firstUrl.searchParams.set("keyword", "");
    firstUrl.searchParams.set("orderBy", "reg_date");
    firstUrl.searchParams.set("perPage", "60");
    firstUrl.searchParams.set("page", "1");

    const firstResponse = await fetch(firstUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Referer: "https://www.sooplive.com/",
      },
    });

    if (!firstResponse.ok) {
      throw new Error(`SOOP API 오류: ${firstResponse.status}`);
    }

    const firstData = (await firstResponse.json()) as SoopResponse;

    if (!Array.isArray(firstData.contents)) {
      throw new Error("SOOP 다시보기 응답 형식이 올바르지 않습니다.");
    }

    allVods.push(...firstData.contents);

    const totalPages = Math.min(
      Math.max(firstData.meta?.totalPages ?? 1, 1),
      100
    );

    for (let page = 2; page <= totalPages; page++) {
      const url = new URL(SOOP_API);
      url.searchParams.set("startDate", "2020-01-01");
      url.searchParams.set("endDate", endDate);
      url.searchParams.set("keyword", "");
      url.searchParams.set("orderBy", "reg_date");
      url.searchParams.set("perPage", "60");
      url.searchParams.set("page", String(page));

      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Referer: "https://www.sooplive.com/",
        },
      });

      if (!response.ok) {
        throw new Error(`SOOP ${page}페이지 조회 실패: ${response.status}`);
      }

      const data = (await response.json()) as SoopResponse;

      if (!Array.isArray(data.contents)) {
        throw new Error(`SOOP ${page}페이지 응답 형식이 올바르지 않습니다.`);
      }

      allVods.push(...data.contents);
    }

    // SOOP 데이터를 저장 형식으로 변환
    const vodMap = new Map<string, VodRow>();

    for (const vod of allVods) {
      if (!vod.titleNo || vod.ucc?.fileType !== "REVIEW") continue;

      const streamDate = getStreamDate(vod);
      if (!streamDate) continue;

      const estimated = getEstimatedStart(vod);
      const duration = vod.ucc?.totalFileDuration;

      vodMap.set(String(vod.titleNo), {
        status: "completed",
        title: vod.titleName?.trim() || null,
        stream_date: streamDate,
        duration_minutes:
          typeof duration === "number"
            ? Math.round(duration / 60000)
            : null,
        vod_id: String(vod.titleNo),
        estimated_time:
          estimated?.date === streamDate ? estimated.time : null,
        estimated_timestamp: estimated?.timestamp ?? null,
      });
    }

    const vodRows = Array.from(vodMap.values());

    // 기존 일정 및 VOD ID 조회
    const { data: existingRows, error: existingError } =
      await supabaseAdmin
        .from("stream_schedule")
        .select(
          "id,status,title,stream_date,scheduled_time,vod_id,is_manually_edited"
        );

    if (existingError) throw existingError;

    const existingSchedules =
      (existingRows ?? []) as ExistingSchedule[];

// 기존 VOD의 누락된 시작 시간 보정
let backfilledCount = 0;

for (const vod of vodRows) {
  const existing = existingSchedules.find(
    (schedule) => schedule.vod_id === vod.vod_id
  );

  // 이미 시간이 있거나 수동 수정된 일정은 건드리지 않음
  if (
    !existing ||
    existing.scheduled_time ||
    existing.is_manually_edited ||
    !vod.estimated_time
  ) {
    continue;
  }

  const { data, error } = await supabaseAdmin
    .from("stream_schedule")
    .update({
      scheduled_time: vod.estimated_time,
    })
    .eq("id", existing.id)
    .is("scheduled_time", null)
    .select("id");

  if (error) throw error;

  if (data?.length) {
    backfilledCount++;
  }
}

    const existingIds = new Set(
      existingSchedules
        .filter((row) => row.vod_id)
        .map((row) => row.vod_id)
    );

    // DB에 아직 없는 VOD만 처리
    const newVods = vodRows
      .filter((vod) => !existingIds.has(vod.vod_id))
      .sort(
        (a, b) =>
          (a.estimated_timestamp ?? 0) -
          (b.estimated_timestamp ?? 0)
      );

    const usedScheduleIds = new Set<number>();

    let matchedCount = 0;
    let insertedCount = 0;

        const newRows: Array<{
      status: "completed";
      title: string | null;
      stream_date: string;
      scheduled_time: string | null;
      duration_minutes: number | null;
      vod_id: string;
    }> = [];

    for (const vod of newVods) {
      let bestCandidate: ExistingSchedule | null = null;
      let bestDifference = Infinity;

      // 같은 날짜의 미완료 예정 일정 중 가장 가까운 시간 찾기
      if (vod.estimated_time) {
        for (const schedule of existingSchedules) {
          if (
            schedule.status !== "scheduled" ||
            schedule.vod_id !== null ||
            schedule.stream_date !== vod.stream_date ||
            !schedule.scheduled_time ||
            usedScheduleIds.has(schedule.id)
          ) {
            continue;
          }

          const difference = getTimeDifference(
            vod.estimated_time,
            schedule.scheduled_time
          );

          if (
            difference <= MATCH_LIMIT_MINUTES &&
            difference < bestDifference
          ) {
            bestCandidate = schedule;
            bestDifference = difference;
          }
        }
      }

      if (bestCandidate) {
        // 기존 예정 일정을 방송 완료로 전환
        const { error } = await supabaseAdmin
          .from("stream_schedule")
          .update({
            status: "completed",
            title: bestCandidate.is_manually_edited
              ? bestCandidate.title
              : vod.title,
            scheduled_time: vod.estimated_time,
            duration_minutes: vod.duration_minutes,
            vod_id: vod.vod_id,
          })
          .eq("id", bestCandidate.id)
          .is("vod_id", null)
          .eq("status", "scheduled");

        if (error) throw error;

        usedScheduleIds.add(bestCandidate.id);
        matchedCount++;
      } else {
        // 매칭할 예정 일정이 없으면 새 완료 기록 생성
               newRows.push({
          status: "completed",
          title: vod.title,
          stream_date: vod.stream_date,
          scheduled_time: vod.estimated_time,
          duration_minutes: vod.duration_minutes,
          vod_id: vod.vod_id,
        });
      }
    }

    // 신규 완료 기록을 100개씩 저장
    for (let i = 0; i < newRows.length; i += 100) {
      const batch = newRows.slice(i, i + 100);

      const { error } = await supabaseAdmin
        .from("stream_schedule")
        .insert(batch);

      if (error) throw error;

      insertedCount += batch.length;
    }

    // 과거 날짜 중 SOOP 다시보기가 없는 날을 자동 휴방 처리
    const vodDates = new Set(
      vodRows.map((vod) => vod.stream_date)
    );

    const existingDates = new Set(
      existingSchedules.map((schedule) => schedule.stream_date)
    );

    let offCount = 0;

    // SOOP에서 확인된 가장 오래된 방송일부터 검사
    const sortedDates = vodRows
      .map((vod) => vod.stream_date)
      .sort();

    if (sortedDates.length > 0) {
      const startDate = new Date(`${sortedDates[0]}T00:00:00Z`);
      const yesterday = new Date(`${endDate}T00:00:00Z`);

      const newOffRows: Array<{
        status: "off";
        title: string;
        stream_date: string;
        duration_minutes: null;
      }> = [];

      const updateOffIds: number[] = [];

      for (
        const date = new Date(startDate);
        date < yesterday;
        date.setUTCDate(date.getUTCDate() + 1)
      ) {
        const dateString = date.toISOString().slice(0, 10);

        // 해당 날짜에 방송이 있었다면 건너뛰기
        if (vodDates.has(dateString)) continue;

        const daySchedules = existingSchedules.filter(
          (schedule) => schedule.stream_date === dateString
        );

        if (daySchedules.length > 0) {
          // 기존 예정 일정이 있다면 휴방으로 변경
          for (const schedule of daySchedules) {
            if (
              schedule.status === "scheduled" &&
              schedule.vod_id === null &&
              !schedule.is_manually_edited
            ) {
              updateOffIds.push(schedule.id);
            }
          }

          continue;
        }

        // 일정 자체가 없으면 휴방 기록 새로 생성
        if (!existingDates.has(dateString)) {
          newOffRows.push({
            status: "off",
            title: "휴방",
            stream_date: dateString,
            duration_minutes: null,
          });
        }
      }

      // 기존 예정 일정 휴방 전환
      if (updateOffIds.length > 0) {
        const { data, error } = await supabaseAdmin
          .from("stream_schedule")
          .update({
            status: "off",
            title: "휴방",
          })
          .in("id", updateOffIds)
          .eq("status", "scheduled")
          .select("id");

        if (error) throw error;

        offCount += data?.length ?? 0;
      }

      // 새 휴방 기록을 100개씩 저장
      for (let i = 0; i < newOffRows.length; i += 100) {
        const batch = newOffRows.slice(i, i + 100);

        const { error } = await supabaseAdmin
          .from("stream_schedule")
          .insert(batch);

        if (error) throw error;

        offCount += batch.length;
      }
    }

    return NextResponse.json({
      success: true,
      message: "SOOP 다시보기 동기화가 완료되었습니다.",
      totalVods: vodRows.length,
      matchedCount,
      insertedCount,
backfilledCount,
      offCount,
      skippedCount: vodRows.length - newVods.length,
    });
  } catch (error) {
    console.error("SOOP 다시보기 동기화 오류:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "다시보기 동기화에 실패했습니다.",
      },
      { status: 500 }
    );
  }
}
