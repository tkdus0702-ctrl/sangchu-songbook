
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Schedule = {
  id: number;
  status: "scheduled" | "completed" | "off";
  title: string | null;
  stream_date: string;
  scheduled_time: string | null;
  duration_minutes: number | null;
  vod_id: string | null;
  is_manually_edited: boolean;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDuration(minutes: number | null) {
  if (minutes === null) return "시간 미등록";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}분`;
  if (mins === 0) return `${hours}시간`;
  return `${hours}시간 ${mins}분`;
}

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formDate, setFormDate] = useState(selectedDate);
  const [formTitle, setFormTitle] = useState("");
  const [formStatus, setFormStatus] = useState<
    "scheduled" | "completed" | "off"
  >("scheduled");
  const [formDuration, setFormDuration] = useState("");
  const [formTime, setFormTime] = useState("00:00");

  const fetchSchedules = useCallback(async () => {
    try {
      const response = await fetch("/api/schedule", {
        cache: "no-store",
      });
      const result = await response.json();

      if (result.success) {
        setSchedules(result.schedules);
      }
    } catch (error) {
      console.error("방송 일정 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkAdmin = () => {
      fetch("/api/admin-check", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => setIsAdmin(data.success))
        .catch(() => setIsAdmin(false));
    };

    fetchSchedules();
    checkAdmin();

    window.addEventListener("admin-status-change", checkAdmin);

    return () => {
      window.removeEventListener("admin-status-change", checkAdmin);
    };
  }, [fetchSchedules]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const total = Math.ceil((firstDay + lastDate) / 7) * 7;

    return Array.from({ length: total }, (_, index) => {
      const day = index - firstDay + 1;

      if (day < 1 || day > lastDate) return null;

      return [
        year,
        String(month + 1).padStart(2, "0"),
        String(day).padStart(2, "0"),
      ].join("-");
    });
  }, [year, month]);

  const selectedSchedules = schedules.filter(
    (item) => item.stream_date === selectedDate
  );

  const today = new Date();
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  function openAddModal() {
    setEditingId(null);
    setFormDate(selectedDate);
    setFormTitle("");
    setFormStatus("scheduled");
    setFormDuration("");
    setFormTime("00:00");
    setModalOpen(true);
  }

  function openEditModal(item: Schedule) {
    setEditingId(item.id);
    setFormDate(item.stream_date);
    setFormTitle(item.title ?? "");
    setFormStatus(item.status);
    setFormDuration(
      item.duration_minutes === null
        ? ""
        : String(item.duration_minutes)
    );
    setFormTime(item.scheduled_time?.slice(0, 5) ?? "00:00");
    setModalOpen(true);
  }

  async function syncSoopVods() {
    if (syncing) return;

    if (!confirm("SOOP 다시보기를 동기화할까요?")) return;

    setSyncing(true);
    setSyncMessage("");

    try {
      const response = await fetch("/api/schedule/sync", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.message ?? "동기화에 실패했습니다.");
        return;
      }

      await fetchSchedules();

      setSyncMessage(
        `동기화 완료! VOD ${result.totalVods}개 · 일정 연결 ${result.matchedCount}개 · 신규 방송 ${result.insertedCount}개 · 자동 휴방 ${result.offCount}개`
      );
    } catch (error) {
      console.error("SOOP 동기화 실패:", error);
      alert("동기화 중 오류가 발생했습니다.");
    } finally {
      setSyncing(false);
    }
  }

  async function saveSchedule() {
    if (!formDate) {
      alert("날짜를 선택해주세요.");
      return;
    }

    const duration =
      formDuration.trim() === "" ? null : Number(formDuration);

    if (
      duration !== null &&
      (!Number.isInteger(duration) || duration < 0)
    ) {
      alert("방송 시간은 0 이상의 분 단위 숫자로 입력해주세요.");
      return;
    }

    const body = {
      id: editingId,
      status: formStatus,
      title: formTitle.trim() || null,
      stream_date: formDate,
      scheduled_time: formTime || null,
      duration_minutes: duration,
    };

    try {
      const response = await fetch("/api/schedule", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.message ?? "저장에 실패했습니다.");
        return;
      }

      setModalOpen(false);
      setSelectedDate(formDate);
      setCurrentMonth(new Date(formDate + "T00:00:00"));
      await fetchSchedules();
    } catch {
      alert("저장 중 오류가 발생했습니다.");
    }
  }

  async function deleteSchedule(id: number) {
    if (!confirm("이 방송 기록을 삭제할까요?")) return;

    try {
      const response = await fetch("/api/schedule", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.message ?? "삭제에 실패했습니다.");
        return;
      }

      await fetchSchedules();
    } catch {
      alert("삭제 중 오류가 발생했습니다.");
    }
  }

  function moveMonth(amount: number) {
    setCurrentMonth(new Date(year, month + amount, 1));
  }

  return (
    <div className="min-h-screen px-4 py-12 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="mb-3 text-sm font-bold tracking-[0.3em] text-[#8eaa65]">
            SANGCHU STREAM
          </p>
          <h1 className="text-4xl font-black text-[#416b36] sm:text-5xl">
            방송 일정
          </h1>
          <p className="mt-4 text-sm text-[#82936e]">
            유상츄의 방송 일정과 지난 방송 기록
          </p>
        </div>

        <div className="rounded-[2rem] border border-[#dce8c6] bg-white/80 p-4 shadow-sm sm:p-8">
          <div className="mb-7 flex items-center justify-between">
            <button
              onClick={() => moveMonth(-1)}
              className="rounded-full bg-[#f0f5e5] px-4 py-2 font-bold text-[#557c42] hover:bg-[#e4edcf]"
            >
              ←
            </button>

            <h2 className="text-2xl font-black text-[#416b36]">
              {year}년 {month + 1}월
            </h2>

            <button
              onClick={() => moveMonth(1)}
              className="rounded-full bg-[#f0f5e5] px-4 py-2 font-bold text-[#557c42] hover:bg-[#e4edcf]"
            >
              →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-3">
            {WEEKDAYS.map((day, index) => (
              <div
                key={day}
                className={`py-3 text-center text-sm font-bold ${
                  index === 0
                    ? "text-rose-400"
                    : index === 6
                      ? "text-blue-400"
                      : "text-[#82936e]"
                }`}
              >
                {day}
              </div>
            ))}

            {calendarDays.map((date, index) => {
              if (!date) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-28 sm:min-h-36"
                  />
                );
              }

              const daySchedules = schedules
                .filter((item) => item.stream_date === date)
                .sort((a, b) =>
                  (a.scheduled_time ?? "99:99").localeCompare(
                    b.scheduled_time ?? "99:99"
                  )
                );

              const isSelected = selectedDate === date;
              const isToday = todayString === date;
              const dayNumber = Number(date.slice(-2));

              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`flex min-h-28 flex-col items-stretch rounded-xl border p-1.5 text-left transition sm:min-h-36 sm:rounded-2xl sm:p-2 ${
                    isSelected
                      ? "border-[#8caf59] bg-[#edf5df] shadow-sm"
                      : "border-transparent hover:border-[#dce8c6] hover:bg-[#f7f9f0]"
                  }`}
                >
                  <span
                    className={`mb-1 flex h-6 w-6 shrink-0 items-center justify-center self-center rounded-full text-xs sm:mb-2 sm:h-7 sm:w-7 sm:text-sm ${
                      isToday
                        ? "bg-[#8caf59] font-bold text-white"
                        : "font-semibold text-[#536b45]"
                    }`}
                  >
                    {dayNumber}
                  </span>

                  <div className="flex w-full flex-col gap-1">
                    {daySchedules.map((item) => (
                      <div
                        key={item.id}
                        className={`w-full rounded px-1 py-1 text-left text-[9px] leading-tight sm:px-1.5 sm:py-1.5 sm:text-xs ${
                          item.status === "off"
                            ? "bg-[#e5e5e5] text-[#777777]"
                            : item.status === "completed"
                              ? "bg-[#e4efd5] text-[#628744]"
                              : "bg-[#fff2c9] text-[#987b2e]"
                        }`}
                      >
                        {item.status === "off" ? (
                          <span className="font-bold">휴방</span>
                        ) : (
                          <>
                            {item.scheduled_time && (
                              <span className="block font-bold">
                                {item.scheduled_time.slice(0, 5)}
                              </span>
                            )}
                            <span className="block break-words font-medium">
                              {item.title ||
                                (item.status === "completed"
                                  ? "방송 기록"
                                  : "예정 방송")}
                            </span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-5 border-t border-[#e8eedc] pt-5 text-xs font-medium text-[#82936e]">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#8caf59]" />
              지난 방송
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#e7c75e]" />
              방송 예정
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#a3a3a3]" />
              휴방
            </span>
          </div>
        </div>

        <div className="mt-8 rounded-[2rem] border border-[#dce8c6] bg-white/80 p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-widest text-[#9ab477]">
                SELECTED DATE
              </p>
              <h2 className="mt-1 text-2xl font-black text-[#416b36]">
                {Number(selectedDate.slice(5, 7))}월{" "}
                {Number(selectedDate.slice(8, 10))}일
              </h2>
            </div>

            {isAdmin && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={syncSoopVods}
                  disabled={syncing}
                  className="rounded-full border border-[#dce8c6] bg-white px-5 py-3 text-sm font-bold text-[#63824c] shadow-sm hover:bg-[#f7f9f0] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {syncing ? "⏳ 동기화 중..." : "📡 SOOP 동기화"}
                </button>

                <button
                  onClick={openAddModal}
                  className="rounded-full bg-[#8caf59] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#739b45]"
                >
                  + 방송 기록 추가
                </button>
              </div>
            )}
          </div>

          {syncMessage && (
            <p className="mb-4 rounded-xl bg-[#edf5df] px-4 py-3 text-sm font-bold text-[#63824c]">
              {syncMessage}
            </p>
          )}

          {loading ? (
            <p className="py-10 text-center text-sm text-[#82936e]">
              방송 기록을 불러오는 중...
            </p>
          ) : selectedSchedules.length === 0 ? (
            <div className="rounded-2xl bg-[#f7f9f0] py-12 text-center">
              <p className="text-3xl">🌱</p>
              <p className="mt-3 font-bold text-[#6f845c]">
                등록된 방송 기록이 없어요.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedSchedules.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5 ${
                    item.status === "off"
                      ? "bg-[#eeeeee]"
                      : "bg-[#f7f9f0]"
                  }`}
                >
                  <div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        item.status === "completed"
                          ? "bg-[#e4efd5] text-[#628744]"
                          : item.status === "off"
                            ? "bg-[#e5e5e5] text-[#777777]"
                            : "bg-[#fff2c9] text-[#a48635]"
                      }`}
                    >
                      {item.status === "completed"
                        ? "방송 완료"
                        : item.status === "off"
                          ? "휴방"
                          : "방송 예정"}
                    </span>

                    <h3
                      className={`mt-3 font-bold ${
                        item.status === "off"
                          ? "text-[#777777]"
                          : "text-[#416b36]"
                      }`}
                    >
                      {item.title ||
                        (item.status === "completed"
                          ? "방송 기록"
                          : "예정 방송")}
                    </h3>

                    {item.scheduled_time && (
                      <p className="mt-1 text-sm font-bold text-[#8caf59]">
                        예정 시간 · {item.scheduled_time.slice(0, 5)}
                      </p>
                    )}

                    {item.status === "completed" && (
                      <p className="mt-1 text-sm text-[#82936e]">
                        방송 시간 · {formatDuration(item.duration_minutes)}
                      </p>
                    )}

                    {item.vod_id && (
                      <p className="mt-1 text-xs text-[#a0ad91]">
                        SOOP 자동 수집 기록
                      </p>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="rounded-full border border-[#dce8c6] px-4 py-2 text-xs font-bold text-[#63824c] hover:bg-white"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => deleteSchedule(item.id)}
                        className="rounded-full border border-rose-100 px-4 py-2 text-xs font-bold text-rose-400 hover:bg-white"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-[2rem] bg-[#f7f9e9] p-7 shadow-xl">
              <h2 className="text-2xl font-black text-[#416b36]">
                {editingId ? "방송 기록 수정" : "방송 기록 추가"}
              </h2>

              <div className="mt-6 space-y-4">
                <label className="block text-sm font-bold text-[#617750]">
                  방송 날짜
                  <input
                    type="date"
                    value={formDate}
                    onChange={(event) => setFormDate(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#dce8c6] bg-white p-3 outline-none focus:border-[#8caf59]"
                  />
                </label>

                <label className="block text-sm font-bold text-[#617750]">
                  예정 방송 시간 (선택)
                  <input
                    type="time"
                    value={formTime}
                    onChange={(event) => setFormTime(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#dce8c6] bg-white p-3 outline-none focus:border-[#8caf59]"
                  />
                </label>

                <label className="block text-sm font-bold text-[#617750]">
                  방송 제목 (선택)
                  <input
                    value={formTitle}
                    onChange={(event) => setFormTitle(event.target.value)}
                    placeholder="방송 제목을 입력해주세요."
                    className="mt-2 w-full rounded-xl border border-[#dce8c6] bg-white p-3 outline-none focus:border-[#8caf59]"
                  />
                </label>

                <label className="block text-sm font-bold text-[#617750]">
                  구분
                  <select
                    value={formStatus}
                    onChange={(event) =>
                      setFormStatus(
                        event.target.value as
                          | "scheduled"
                          | "completed"
                          | "off"
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-[#dce8c6] bg-white p-3 outline-none focus:border-[#8caf59]"
                  >
                    <option value="scheduled">방송 예정</option>
                    <option value="completed">방송 완료</option>
                    <option value="off">휴방</option>
                  </select>
                </label>

                {formStatus === "completed" && (
                  <label className="block text-sm font-bold text-[#617750]">
                    방송 시간 (분)
                    <input
                      type="number"
                      min="0"
                      value={formDuration}
                      onChange={(event) =>
                        setFormDuration(event.target.value)
                      }
                      placeholder="예: 332"
                      className="mt-2 w-full rounded-xl border border-[#dce8c6] bg-white p-3 outline-none focus:border-[#8caf59]"
                    />
                  </label>
                )}
              </div>

              <div className="mt-7 flex gap-3">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-full border border-[#dce8c6] py-3 text-sm font-bold text-[#71845f]"
                >
                  취소
                </button>
                <button
                  onClick={saveSchedule}
                  className="flex-1 rounded-full bg-[#8caf59] py-3 text-sm font-bold text-white hover:bg-[#739b45]"
                >
                  저장하기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
