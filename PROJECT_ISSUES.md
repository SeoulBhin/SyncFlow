# 프로젝트 점검 결과 — 논리적·물리적 이슈

> 작성일: 2026-05-14 / 대상 브랜치: `main`
> 각 항목은 **현상 → 원인 → 수정 시 영향 → 권장 선택지**로 정리한다. 결정은 팀장이 한다.

---

## ⚠️ 즉시 수정 권장 (실서비스 동작에 직접 영향)

### 1. `backend/livekit.yaml` 끝줄 YAML 파싱 오염
**현상**: 파일 마지막 줄이 다음과 같이 끝남.
```yaml
logging:
  level: info  백엔드에 livekit.yaml 만들어서 넣으면 됨
```
주석 처리(`#`)가 안 된 한글 안내문이 `level` 값에 그대로 붙어 있다. YAML 파서가 `info  백엔드에...` 전체를 문자열로 읽어 LiveKit이 부팅 자체를 거부하거나 로그 레벨을 무시한다.

**원인**: 개발 중 메모를 그대로 커밋함.

**수정**:
```yaml
logging:
  level: info
```

**영향**:
- ✅ 회의방 영상/음성 안정화
- ✅ `docker logs syncflow-livekit`에 정상 로그가 찍힘
- 단점: 없음

**선택지**:
- (A) 지금 바로 1줄 수정 + 커밋 (권장)
- (B) 보류 — 단, 회의 기능 데모 전에는 반드시 수정

---

### 2. AI 모듈이 코드는 존재하는데 `미착수`로 표기됨
**현상**:
- `backend/src/ai/` 안에 `ai.controller.ts`, `ai.service.ts`, `rag.service.ts`, `embedding.service.ts`, 5개 엔티티 + DTO 전부 구현되어 있음
- `app.module.ts`에 `AiModule`이 import되어 있어 부팅 시 로드됨
- `GoogleGenerativeAI`를 생성자에서 호출하므로 `GEMINI_API_KEY`가 비어있으면 **백엔드 부팅 자체가 실패**할 수 있음
- 그런데 README/CLAUDE.md는 "미착수 (남궁훈)"으로 적혀 있어 팀원들이 환경변수 없이 켤 가능성 있음

**원인**: 문서가 코드 진행을 못 따라감.

**수정 선택지**:
- **(A) 문서를 코드 상태에 맞춘다** — README, CLAUDE.md의 "AI 미착수" 표기를 "AI 일부 구현 (RAG 임베딩·대화 흐름 완성, 키 필요)"로 갱신. (권장, 영향 0)
- **(B) AI 모듈을 graceful degrade** — `GEMINI_API_KEY`가 없을 때 AiService가 부팅은 되지만 호출 시 503 반환하도록 변경. 새 팀원이 키 없이도 부팅 가능. (수정 범위: `ai.service.ts` 생성자 1곳, ~10줄)
- **(C) 임시 AppModule에서 AiModule 분리** — env 플래그 (`AI_ENABLED=true`)일 때만 import. (수정 범위: app.module 동적 import, ~5줄)

> A + B 조합이 가장 안전. 우선 A만 해도 부팅 사고는 막을 수 있다.

---

### 3. TypeORM `synchronize: true` (development) + Prisma 마이그레이션 동시 사용
**현상**: `app.module.ts`에서 `synchronize: config.get('NODE_ENV') === 'development'` 로 설정되어 있다. 즉 dev 부팅 시 TypeORM이 엔티티 메타데이터를 보고 임의로 컬럼을 추가/변경한다. 그런데 DB 스키마의 진실의 원천은 Prisma 마이그레이션이다.

**위험**:
- 누군가 엔티티만 수정하고 Prisma 마이그레이션을 안 만들면, 본인 로컬은 동작하지만 다른 팀원이 `prisma migrate dev`로 받은 스키마는 다름 → "내 컴에선 되는데" 발생
- 특히 `meeting_visibility_participants` 같은 최근 마이그레이션 7건과 충돌 가능

**수정 선택지**:
- **(A) `synchronize: false` 고정** — Prisma 마이그레이션만이 스키마를 바꾼다. 가장 안전. (수정 1줄)
- **(B) 그대로 두고 팀 규칙으로 통제** — 엔티티 변경 시 반드시 마이그레이션 PR 동봉. (문서만 갱신)

> 졸업 프로젝트 마감 전 사고를 줄이려면 (A) 권장. 다만 (A)로 바꾸면 새 팀원은 마이그레이션을 직접 실행해야 부팅됨 (README에 이미 있으니 OK).

---

## 🟡 사용자 경험·정합성 이슈 (지금 안 고쳐도 부팅은 됨)

### 4. `AppLayout`이 하드코딩된 AI 컨텍스트 배너를 항상 표시
**현상**: `src/components/layout/AppLayout.tsx:64-67`에서 모든 사용자에게 항상
> "최근 회의 '주간 마케팅 전략 회의'가 종료되었습니다. AI가 회의록을 자동으로 생성할 수 있습니다."
배너가 노출된다. 실제 회의 종료 이벤트와 연결되어 있지 않다.

**수정 선택지**:
- **(A) 즉시 제거** — AppLayout에서 `<AIContextBanner>` 통째로 삭제. 추후 회의 종료 이벤트와 연결할 때 다시 추가. (권장, 5줄 삭제, 영향 0)
- **(B) 회의 store와 연결** — `useMeetingStore`의 `lastEndedMeeting`을 구독해서 종료 직후에만 표시. (수정 범위: AppLayout + meeting store, ~30줄)

> 메모리에 저장된 사용자 피드백("자동동작 최소화")과 정확히 어긋난다. (A) 권장.

---

### 5. 빈 백엔드 폴더 (`voice-chat/`, `screen-share/`)
**현상**: 두 폴더 모두 파일 0개. LiveKit 모듈로 대체되었지만 폴더만 남음.

**수정**:
- **(A) 폴더 삭제** — 깔끔. 작업 충돌 없음.
- **(B) 유지** — 그대로 두고 README에 "deprecated" 명시.

> 영향 0, (A) 권장.

---

### 6. `schedules/` / `subscriptions/` 폴더 비어있음
**현상**: 미착수. `app.module.ts`에 import 안 되어 있어 부팅엔 영향 없음. 단, 폴더만 있으니 새 팀원이 "여기 어디까지 됐지?" 헷갈림.

**수정 선택지**:
- (A) 그대로 두고 README/CLAUDE.md에 "미착수" 명시 (현재 상태)
- (B) `.gitkeep`만 두고 빈 `module.ts` 스텁 생성 — 담당자 onboarding 쉬워짐

> 영향 미미.

---

### 7. `backend/livekit.yaml` 주석에 변수명 오타 (`LIVE_API_SECRET`)
**현상**: 11번째 줄 주석 `백엔드/ .env 의 LIVEKIT_API_KEY / LIVE_API_SECRET 와 일치` — `LIVEKIT_API_SECRET`이 맞다.

**수정**: 주석만 한 글자 추가. 동작 영향 0, 가독성만.

---

### 8. `prisma.config.ts`의 `dotenv` 의존성이 root `package.json`에 없음
**현상**: `import { config } from "dotenv"` 사용하지만 root deps에 `dotenv` 없음. 현재는 `@nestjs/config`가 backend에서 transitively 끌어오기 때문에 hoisting으로 동작 중. 이는 환경에 따라 깨질 수 있다 (`npm ci`, lockfile 정리, workspaces 설정 변경 등).

**수정 선택지**:
- **(A) root에 명시적 추가**: `npm i -D dotenv` (권장, 안전망)
- **(B) 그대로 두기** — 깨지면 그때 대응

> 영향: (A) 선택해도 0. 그냥 추가하는 게 미래의 나를 살린다.

---

### 9. CORS origin 단일값 + 기본 fallback 포트가 5174 고정
**현상**: `main.ts`에서 `origin: process.env.FRONTEND_URL || 'http://localhost:5174'`. 팀원이 5173에서 띄우거나 vite가 포트를 자동 변경하면 차단됨.

**수정 선택지**:
- **(A) dev 한정 다중 origin 허용**: `[5173, 5174, 5175]` 또는 `localhost.*` 정규식. 가장 흔한 사고를 막음.
- **(B) 그대로** — `FRONTEND_URL` 정확히 맞추면 됨. 문서에 명시.

> 졸프 데모처럼 PC 바꿔가며 띄울 일이 많으면 (A).

---

### 10. SlackSidebar의 mock import 잔재
**현상**: `MOCK_CHANNELS`, `MOCK_CHAT_CHANNELS`, `MOCK_ORGANIZATIONS` 가 `SlackSidebar.tsx`에 여전히 import되어 있고 unread 카운트 계산에 사용된다. 빈 배열이라 동작 자체는 OK이지만 dead import + 실제 unread 미구현 상태.

**수정 선택지**:
- **(A) Slack 정렬 Phase 1에서 메시지 핀/저장/알림과 함께 unread를 백엔드 API로 빼는 시점에 정리** — 지금은 보류 (권장)
- (B) 지금 mock 의존 제거 + unread는 0으로 고정

> 굳이 지금 손댈 필요 없음. UI.md "Slack 정렬 로드맵" Phase 1에서 묶어서.

---

### 11. `uploads/` 정적 디렉토리가 git에 없음
**현상**: `main.ts`에서 `process.cwd()/uploads`를 서빙하지만 디렉토리가 미리 없으면 `multer`가 파일 저장 시도 시 ENOENT 가능. 모듈마다 폴더 생성 로직이 있을 수도 있고 아닐 수도 있음 (확인 필요).

**수정 선택지**:
- **(A) `backend/uploads/.gitkeep` 추가** — 가장 무난.
- (B) upload 모듈이 자체적으로 `fs.mkdirSync({ recursive: true })` 하는지 확인 후 결정

> (A)는 1분, 영향 0.

---

## ✅ 점검 결과 — 정상 동작 영역
- `docker-compose.yml`: PostgreSQL/Redis/LiveKit 포트와 환경변수 정합 OK
- `vite.config.ts`: 프록시 3개(`/api`, `/socket.io`, `/uploads`) 정상
- 인증·그룹·채널·메시지·회의·태스크 등 13개 모듈 코드 + 마이그레이션 7건 일치 (CLAUDE.md 기준)
- `AuthService.seedTestUsersIfDev` 자동 시드 OK
- Prisma 마이그레이션 7건이 ERD.md와 정합

---

## 권장 처리 순서

| 순위 | 항목 | 예상 작업량 | 위험도 |
|------|------|-------------|--------|
| 1 | livekit.yaml 끝줄 정리 (#1) | 1분 | 없음 |
| 2 | AI 모듈 문서 갱신 + graceful degrade (#2-A,B) | 20분 | 낮음 |
| 3 | AppLayout 가짜 배너 제거 (#4-A) | 2분 | 없음 |
| 4 | TypeORM synchronize false 고정 (#3-A) | 1분 | 중간 (팀원 재실행 필요) |
| 5 | 빈 폴더 정리 (#5,#6) | 5분 | 없음 |
| 6 | dotenv root 추가 (#8-A) | 1분 | 없음 |
| 7 | CORS 다중 origin (#9-A) | 5분 | 없음 |
| 8 | uploads/.gitkeep (#11-A) | 1분 | 없음 |

> **"전부 진행"** 선택 시 총 35분 내외. **"1번만"**, **"3번까지만"** 등 부분 진행도 가능.
> 결정해 주시면 그대로 PR 한 번에 묶어 처리합니다.
