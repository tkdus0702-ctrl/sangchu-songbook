"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const profileInfo = [
  { label: "BIRTHDAY", value: "February 16th" },
  { label: "DEBUT", value: "2024. 12. 28" },
  { label: "MBTI", value: "INFP" },
];

const chatRules = [
  {
    title: "타스 언급 / 비난 금지",
    description: "관련 주제가 나왔을 때는 OK. \n무분별하게 계속해서 누군가를 언급하는 행동은 금지.",
  },
  {
    title: "리모컨 / 훈수 / 뻐꾸기 금지",
    description: "알려주시는 건 괜찮지만 지나친 훈수는 금지.\n리모컨 하실 거면 저희 오빵이들 제치고 올라와서 물어보세요.",
  },
  {
    title: "시청자 닉언 / 친목 / 채팅 / 네임드화 금지",
    description: "회장님, 부회장님 등 특정 시청자 언급 금지.\n특정 '누구'님이 해주겠지 하는 행동도 금지.",
  },
  {
    title: "일기장 / 녹음기 금지",
    description: "뜬금없이 주제를 꺼내는 행동 금지.\n특정 녹음기를 반복하는 행동도 금지.",
  },
  {
    title: "무분별한 비판 / 성희롱 / 패드립 / 욕 금지",
    description: "가벼운 WWE냐한 농담은 OK.\n이유 없는 까내림과 비판을 아주 싫어합니다.\n욕은 채금 → 강퇴.",
  },
  {
    title: "논란 주제 금지",
    description: "갈라치기, 정치, 종교, 커뮤니티, 젠더 관련 주제 금지.\n특히 몰아가기 하지 마세요. (색깔, 방향 등등)",
  },
  {
    title: "터렛 / 풍막 / 유입막 행동 금지",
    description: "새로운 시청자의 유입을 방해하거나 방송 흐름을 막는 행동 금지.",
  },
  {
    title: "컨텐츠 평가 금지",
    description: "상츄가 가져오는 컨텐츠 자체를 평가하지 말아주세요.\n컨텐츠 방향이 틀어졌을 때 의견을 내는 것은 괜찮습니다.",
  },
  {
    title: "풍 장난 블랙",
    description: "풍 장난은 블랙 대상입니다.",
  },
  {
    title: "시청자와 스트리머 간 개인 연락 금지",
    description: "시청자와 스트리머의 관계를 위해 개인 연락은 금지합니다.",
  },
];

const promises = [
  "밥 잘 챙겨먹기 (커피로 때우지 않기)",
  "지각 안하기",
  "잠 잘 자기",
  "건강하기",
  "모종이들과의 약속 지키기",
];

const goals = [
  "애청자 3,000명",
  "동청자 50명 (통나무 X)",
  "베스트 스트리머",
  "유튜브 시작하기",
  "개인 컨텐츠",
  "이름 / 채팅 잘 구분해서 읽기",
  "좋은 쪽으로 언급되기",
  "지각 안하기",
  "카페 이용 잘하기",
  "헬스장 주 3일 이상",
];

const irisMembers = [
  {
    name: "이라",
    description: "영원한 큐트 허당 리더",
    url: "https://www.sooplive.com/station/star52",
  },
  {
    name: "유상츄",
    description: "허당미 넘치는 들뜬 상츄",
    url: "https://www.sooplive.com/station/hiyam2411",
  },
  {
    name: "세온",
    description: "우리 팀의 중축, 사랑스러운 노력파 없으면 안 될 메인보컬",
    url: "https://www.sooplive.com/station/seon12",
  },
  {
    name: "류새백",
    description: "꼬순내 나는 강R쥐, 음색 고트",
    url: "https://www.sooplive.com/station/seharug",
  },
  {
    name: "루빗",
    description: "최고 똑순이 귀요미 우주토끼",
    url: "https://www.sooplive.com/station/bluerabbit01",
  },

];

const irisLinks = [
  {
    label: "유튜브 · 커버곡 채널",
    url: "https://www.youtube.com/@IRISLove1004",
  },
  {
    label: "유튜브 · 쇼츠 채널",
    url: "https://www.youtube.com/@우당탕탕이리스",
  },
  {
    label: "팬카페",
    url: "https://cafe.naver.com/iris2514",
  },
];


const tmiItems = [
  {
    title: "모종이",
    description: "유상츄의 팬네임이다.\n아직 팬캐릭터는 없지만 곧 팬캐릭터가 나올 예정이다.",
  },
  {
    title: "방송에서 자주 언급되는 스트리머",
    description: "리츠 / 코뇨 / 네네르 / 이리스 멤버(이라, 세온, 루빗, 류새백)\n\n*방장 언급 시에만 언급 부탁드립니다.",
  },
  {
    title: "내가 너무 들떴었나봐 / 여기가 000방송 맞나요",
    description:
      "방종 후 들뜬 마음에 찌해의 생방송에 놀러간 유상츄가 찌해 방송에 남겼던 채팅이 괜히 신경 쓰여, 그날 디코로 사과를 남긴 일화에서 시작된 밈이다.\n\n찌해가 해당 일화를 방송에서 녹음기로 조리돌림하면서 남게 되었다.",
  },
  {
    title: "상당한 에겐녀이다",
    description:
      "눈물과 갬성이 넘쳐서 가끔 모종이들이 이해하기 어려운 포인트에서 눈물을 보이는 경우가 많다.\n\n예시\n· 실미도 보고 울기\n· 오래 쓰던 마이크를 떠나보내야 한다는 생각에 울기\n· 옹삼골 서버 엔딩 보고 울기",
  },
  {
    title: "게임 피지컬 아메바",
    description:
      "게임을 방송하면서 본격적으로 접하기 시작해 게임 피지컬이 아직은 좋지 않다.\n\n2026.06.03 기준 플레이 시간\n· 배틀그라운드 242시간\n· 롤 AI전 1판\n· 오버워치 15시간 미만\n· 종합게임 다수\n· 윷놀이 승률 15%",
  },
];

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8">
      <p className="mb-2 text-xs font-black tracking-[0.25em] text-[#91ad55]">
        {eyebrow}
      </p>
      <h2 className="text-2xl font-black tracking-tight text-[#416b36] sm:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="mt-2 text-sm leading-7 text-[#82916e]">
          {description}
        </p>
      )}
    </div>
  );
}
const pageSections = [
  { id: "profile", label: "프로필" },
  { id: "tmi", label: "특징 & TMI" },
  { id: "chat-rules", label: "채팅 규칙" },
  { id: "promises", label: "시청자와의 약속" },
  { id: "goals", label: "방송 목표" },
  { id: "iris", label: "이리스" },
];

export default function Home() {
  const [activeSection, setActiveSection] = useState("profile");

  useEffect(() => {
    const sectionElements = pageSections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top
          )[0];

        if (current) {
          setActiveSection(current.target.id);
        }
      },
      {
        rootMargin: "-20% 0px -65% 0px",
        threshold: 0,
      }
    );

    sectionElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f9e9]">

  {/* 왼쪽 고정 목차 */}
  <aside className="fixed left-5 top-[38%] z-50 hidden w-48 -translate-y-1/2 lg:block">
    <div className="rounded-2xl border border-[#e2e9ce] bg-[#fbfcef]/95 p-3 shadow-[0_8px_30px_rgba(93,125,53,0.10)] backdrop-blur">

      <p className="mb-3 px-3 pt-2 text-[10px] font-black tracking-[0.22em] text-[#9aaa7d]">
        PAGE INDEX
      </p>

      <nav aria-label="페이지 목차" className="space-y-1">
        {pageSections.map((section, index) => {
          const isActive = activeSection === section.id;

          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              aria-current={isActive ? "location" : undefined}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                isActive
                  ? "bg-[#e8efcf] font-black text-[#416b36] shadow-sm"
                  : "font-medium text-[#82916e] hover:bg-white hover:text-[#496b3b]"
              }`}
            >
              <span
                className={`text-[10px] font-black ${
                  isActive
                    ? "text-[#78964f]"
                    : "text-[#b2bd9d]"
                }`}
              >
                0{index + 1}
              </span>

              <span>{section.label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  </aside>

  {/* 본문 영역 */}
  <div className="lg:pl-56">
      {/* 프로필 소개 */}
      <section id="profile" className="scroll-mt-24 mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
        <div className="mb-10 flex items-center gap-3">
          <span className="h-1 w-10 rounded-full bg-[#a8cb68]" />
          <p className="text-xs font-bold tracking-[0.25em] text-[#82916e]">
            YOUSANGCHU PROFILE
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-[300px_1fr] md:gap-12">
          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border-4 border-white bg-[#e5edca] shadow-[0_12px_40px_rgba(93,125,53,0.10)]">
              <Image
                src="/example.png"
                alt="유상츄 프로필 사진"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 300px"
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-4 -right-3 rounded-2xl bg-[#f2e58a] px-5 py-3 shadow-sm">
              <p className="text-xs font-black tracking-widest text-[#648047]">
                SANGCHU ♡
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <p className="mb-3 text-sm font-bold tracking-[0.2em] text-[#91ad55]">
              VIRTUAL STREAMER
            </p>
            <h1 className="text-5xl font-black tracking-tight text-[#416b36] sm:text-6xl">
              유상츄<span className="text-[#a8cb68]">.</span>
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-8 text-[#71835d] sm:text-base">
              허당미 넘치는 버츄얼 스트리머 유상츄.
              <br />
              SOOP에서 다양한 방송과 컨텐츠로 모종이들과 함께하고 있습니다.
            </p>

            <div className="mt-6 inline-flex w-fit items-center gap-3 rounded-full border border-[#dce6bd] bg-white/70 px-4 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#a8cb68]" />
              <span className="text-sm font-bold text-[#648047]">
                IRIS 크루 소속
              </span>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {profileInfo.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#e2e9ce] bg-white/70 p-4"
                >
                  <p className="text-[10px] font-black tracking-widest text-[#9aaa7d]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm font-bold text-[#496b3b]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

          </div>
        </div>

      </section>

      {/* 성격 & TMI */}
      	<section id="tmi" className="scroll-mt-24 border-y border-[#e3e9d0] bg-white/50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionHeading
            title="특징 & TMI"
            description="모종이들이 알아두면 재미있는 유상츄의 이야기."
          />

          <div className="grid gap-4 md:grid-cols-2">
            {tmiItems.map((item, index) => (
              <article
                key={item.title}
                className={`rounded-3xl border border-[#e4eacd] p-6 sm:p-7 ${
                  index % 2 === 0 ? "bg-[#f7f9e9]" : "bg-[#f5f0c9]"
                } ${index === 2 || index === 3 || index === 4 ? "md:col-span-2" : ""}`}
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black text-[#8ba65d]">
                    0{index + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-[#496b3b]">
                      {item.title}
                    </h3>
                    <p className="mt-3 whitespace-pre-line text-sm leading-8 text-[#71835d]">
                      {item.description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 채팅 규칙 */}
      <section id="chat-rules" className="scroll-mt-24 mx-auto max-w-6xl px-6 py-20">
        <SectionHeading
          eyebrow="CHAT RULES · UPDATED 2026.10.01"
          title="채팅 규칙"
          description="즐겁고 편안한 방송을 위해 아래 규칙을 꼭 지켜주세요."
        />

        <div className="grid gap-3 md:grid-cols-2">
          {chatRules.map((rule, index) => (
            <article
              key={rule.title}
              className="flex gap-4 rounded-2xl border border-[#e2e9ce] bg-white/70 p-5 transition hover:-translate-y-1 hover:shadow-md"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e7efcf] text-sm font-black text-[#648047]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-bold leading-6 text-[#496b3b]">
                  {rule.title}
                </h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#82916e]">
                  {rule.description}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-[#f5edb9] p-6 text-center">
          <p className="font-bold text-[#796e39]">
            규칙 미준수 시 블랙이 될 수 있습니다.
          </p>
          <p className="mt-2 text-sm text-[#8c8150]">
            시청자와 스트리머의 관계를 위해 꼭 지켜주세요..!
          </p>
        </div>
      </section>

      {/* 시청자와의 약속 */}
      <section id="promises" className="scroll-mt-24 bg-[#e8efcf]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <SectionHeading
            eyebrow="PROMISE"
            title="시청자와의 약속"
            description="💚 모종이들과 함께 지켜나갈 다섯 가지 약속."
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {promises.map((promise, index) => (
              <div
                key={promise}
                className="flex items-center gap-4 rounded-2xl border border-white/70 bg-white/65 p-5"
              >
                <span className="text-xl font-black text-[#a8cb68]">
                  0{index + 1}
                </span>
                <p className="text-sm font-bold leading-6 text-[#557343]">
                  {promise}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 방송 목표 */}
      <section id="goals" className="scroll-mt-24 mx-auto max-w-6xl px-6 py-20">
        <SectionHeading
          eyebrow="GOALS · UPDATED 2025.12.28"
          title="방송 목표"
          description="유상츄가 모종이들과 함께 이루고 싶은 목표들."
        />

        <div className="rounded-3xl border border-[#e2e9ce] bg-white/70 p-6 sm:p-9">
          <div className="grid gap-3 sm:grid-cols-2">
            {goals.map((goal, index) => (
              <div key={goal} className="flex items-center gap-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e7efcf] text-xs font-black text-[#78964f]">
                  {index + 1}
                </span>
                <span className="text-sm font-semibold text-[#61784d]">
                  {goal}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

{/* 이리스 이야기 */}
<section id="iris" className="scroll-mt-24 mx-auto max-w-6xl px-6 py-20">
  <SectionHeading
    eyebrow="ABOUT IRIS"
    title="이리스가 머에오?"
    description="무지개처럼 다양한 색을 가진 버튜버 커버팀, 이리스."
  />

  {/* 이리스 소개 */}
  <div className="mb-8 rounded-3xl border border-[#E5CCDD] bg-[#E5CCDD]/25 p-6 sm:p-9">
    <div className="mb-3 text-xs font-black tracking-[0.2em] text-[#A77F9B]">
      INTRODUCTION
    </div>
    <h3 className="mb-3 text-2xl font-black text-[#76566E]">
      [ 이리스 ]
    </h3>
    <p className="text-sm leading-7 text-[#806A7B]">
      무지개처럼 다양한 색을 가진 버튜버 커버팀
    </p>

    <div className="mt-7 overflow-hidden rounded-2xl">
      <img
        src="/IRIS.png"
        alt="이리스"
        className="h-auto w-full object-cover"
      />
    </div>
  </div>

  {/* 멤버 소개 */}
  <div className="mb-8">
    <div className="mb-5 flex items-center gap-3">
      <span className="h-6 w-1.5 rounded-full bg-[#E5CCDD]" />
      <h3 className="text-xl font-black text-[#76566E]">MEMBERS</h3>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {irisMembers.map((member, index) => (
        <a
          key={member.name}
          href={member.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-2xl border border-[#E5CCDD] bg-white/80 p-6 transition-all hover:-translate-y-1 hover:bg-[#E5CCDD]/20 hover:shadow-lg hover:shadow-[#E5CCDD]/20"
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E5CCDD]/50 text-sm font-black text-[#99728D]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-xs font-bold text-[#B49AAE] transition-colors group-hover:text-[#99728D]">
              SOOP ↗
            </span>
          </div>

          <h4 className="mb-2 text-lg font-black text-[#76566E]">
            {member.name}
          </h4>
          <p className="text-sm leading-6 text-[#8D7889]">
            {member.description}
          </p>
        </a>
      ))}
    </div>
  </div>

  {/* 관련 링크 */}
  <div className="mb-8 rounded-3xl border border-[#E5CCDD] bg-white/70 p-6 sm:p-9">
    <div className="mb-5 text-xs font-black tracking-[0.2em] text-[#A77F9B]">
      RELATED LINKS
    </div>
    <h3 className="mb-5 text-xl font-black text-[#76566E]">
      이리스 관련 링크
    </h3>

    <div className="grid gap-3 sm:grid-cols-3">
      {irisLinks.map((link) => (
        <a
          key={link.label}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-xl border border-[#E5CCDD] bg-[#E5CCDD]/15 px-5 py-4 text-sm font-bold text-[#806A7B] transition-colors hover:bg-[#E5CCDD]/40"
        >
          {link.label}
          <span className="text-[#A77F9B]">↗</span>
        </a>
      ))}
    </div>
  </div>

  {/* 스페셜 땡스 */}
  <div className="rounded-3xl border border-[#E5CCDD] bg-[#E5CCDD]/25 p-6 sm:p-9">
    <div className="mb-3 text-xs font-black tracking-[0.2em] text-[#A77F9B]">
      SPECIAL THANKS
    </div>
    <h3 className="mb-4 text-xl font-black text-[#76566E]">
      스페셜 땡스
    </h3>

    <div className="space-y-3 text-sm leading-7 text-[#806A7B]">
      <p>
        이리스 멤버들의 방송에서 500개 이상 후원하신 후
        <strong className="text-[#76566E]">
          {" "}‘스페셜 땡스 해주세요’
        </strong>
        라고 말씀하시면 영상 크레딧에 이름이 들어갑니다.
      </p>

      <p>
        상츄에게 선물하실 경우, 당시 준비 중인 곡 영상의 크레딧에
        스페셜 땡스로 들어갑니다.
      </p>

      <p className="font-bold text-[#76566E]">
        해당 커버곡의 당사자에게 후원해 주셔야 합니다!
      </p>

      <p className="text-xs text-[#A18A9C]">
        * 개인곡과 단체곡에 따라 내용이 다를 수 있으니 문의 부탁드립니다 :)
      </p>

      <div className="my-4 h-px bg-[#E5CCDD]" />

      <p>
        보내주신 후원금은 퀄리티 업과 방송용 등 방송 발전을 위해
        소중하게 사용하겠습니다!
      </p>
    </div>
  </div>
</section>

      {/* 푸터 */}
      <footer className="border-t border-[#e1e8ca] bg-[#f1f4df] px-6 py-10 text-center">
        <p className="text-sm font-black tracking-[0.2em] text-[#648047]">
          MADE WITH ♡ FOR SANGCHU
        </p>
        <p className="mt-3 text-xs text-[#9aaa7d]">
          유상츄 팬페이지 · YOUSANGCHU
        </p>
           </footer>
      </div>
    </div>
  );
}
