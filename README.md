# SyncFlow

AI가 회의에 참여하는 스마트 협업 플랫폼 — 실시간 문서·코드 협업, 음성 회의, 작업 관리, RAG 기반 AI를 하나의 워크스페이스에서.

> 계명대학교 컴퓨터공학과 졸업 프로젝트 | 팀: 2학년의 무게
> 팀장 김경빈(SeoulBhin) / 김명준(kkmmjj12) / 김봉만(b_many) / 이도현(di593488) / 남궁훈(hoon2436)

---

## 빠른 시작 (5분 컷)

### 사전 요구사항
- Node.js 20+, npm 9+
- Docker Desktop **실행 중**
- `backend/.env` 파일 (없으면 아래 1번 참조)

### 실행 순서

```bash
# 1) 인프라 (PostgreSQL pgvector + Redis + LiveKit)
npm run docker:up

# 2) 의존성 설치 (루트 한 번, backend 한 번)
npm install
npm --prefix backend install

# 3) DB 마이그레이션 (최초 1회 또는 마이그레이션 추가 후)
docker exec syncflow-postgres psql -U syncflow -d syncflow -c "CREATE EXTENSION IF NOT EXISTS vector;"
npx prisma migrate dev

# 4) 개발 서버 (프론트 + 백 동시 실행)
npm run dev:all
```

- 프론트: http://localhost:5174
- 백엔드: http://localhost:3000
- 테스터 로그인: `tester1@test.com` / `tester2@test.com` / `tester3@test.com` (비번 모두 `test1234`)
  - dev 부팅 시 자동 생성됨. 로그인 안 되면 백엔드 로그에 시드 메시지 확인.

---

## .env 최신화 (가장 자주 발생하는 사고)

### 보안상 git에 못 올리는 키 목록
`backend/.env` 는 `.gitignore` 처리되어 있어 **팀원이 알아서 채워야** 한다. 누락되면 회의/AI/OAuth/업로드가 전부 죽는다.

| 키 | 어디서 발급 | 누락 시 증상 |
|---|---|---|
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | 아무 랜덤 32바이트 (`openssl rand -hex 32`) | 로그인 직후 401 |
| `GOOGLE_CLIENT_ID/SECRET` | https://console.cloud.google.com/apis/credentials | Google 소셜 로그인 버튼 클릭 시 500 |
| `GITHUB_CLIENT_ID/SECRET` | https://github.com/settings/developers | GitHub 소셜 로그인 실패 |
| `KAKAO_CLIENT_ID/SECRET` | https://developers.kakao.com/console/app | Kakao 소셜 로그인 실패 |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey | AI 어시스턴트 응답 안 옴 |
| `GOOGLE_STT_KEY_JSON` | GCP IAM → Service Account → JSON 키 (한 줄) | 회의 STT 안 됨 |
| `GCS_BUCKET` | GCP Storage 버킷 이름 | 파일 업로드 시 500 |
| `LIVEKIT_API_KEY/SECRET` | `backend/livekit.yaml` `keys` 항목과 **반드시 일치** | 회의방 입장 후 영상/음성 연결 안 됨 |

> 위 키들은 팀 공용으로 한 번 발급한 값을 디스코드 비공개 채널에서 받아 `backend/.env`에 그대로 붙여넣으면 된다.
> 새로 발급할 일이 생기면 팀장에게 공유 → 다른 팀원들은 `.env`만 교체.

### `backend/.env`가 아예 없을 때
```bash
cp backend/.env.example backend/.env
# 그 다음 비어있는 값들 채우기
```

---

## 자주 뜨는 오류 → 해결법

### 1) `Error: connect ECONNREFUSED 127.0.0.1:5432`
PostgreSQL 컨테이너가 안 떠 있음.
```bash
docker ps                 # syncflow-postgres 가 Up 상태인지 확인
npm run docker:up         # 안 떠 있으면 실행
```

### 2) `relation "users" does not exist` (또는 다른 테이블)
마이그레이션 미적용.
```bash
npx prisma migrate dev    # 루트에서 실행. backend/ 아님 주의
```

### 3) `type "vector" does not exist`
pgvector 확장 미설치.
```bash
docker exec syncflow-postgres psql -U syncflow -d syncflow -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 4) `Cannot find module '@/...'` 또는 빌드 시 type error 도배
- `npm install`을 **루트와 `backend/` 양쪽 다** 했는지 확인
- `node_modules` 지우고 재설치: `rm -rf node_modules backend/node_modules && npm install && npm --prefix backend install`

### 5) 회의 입장 후 영상/음성이 안 잡힘 (LiveKit)
- `backend/livekit.yaml`의 `keys` 항목과 `.env`의 `LIVEKIT_API_KEY/SECRET`가 일치하는지 확인
- 방화벽이 UDP 50000-50020 막고 있는지 확인
- `docker logs syncflow-livekit`에서 에러 확인 (YAML 파싱 에러면 yaml 파일 깨진 것)

### 6) `JwtStrategy requires a secret or key`
`.env`의 `JWT_SECRET` / `JWT_REFRESH_SECRET`이 비어 있음. 아무 랜덤 문자열이라도 채워야 부팅됨.

### 7) Google STT / Gemini 401·404
`GEMINI_API_KEY`가 비어있거나 `GOOGLE_STT_KEY_JSON`의 JSON 형식이 깨짐. `private_key` 안의 `\n`은 그대로 둬도 됨 (코드가 자동 변환).

### 8) `tester1@test.com` 로그인 안 됨
dev 모드에서만 자동 시드됨. `NODE_ENV=production`으로 띄웠는지 확인. `.env`의 `NODE_ENV=development` 또는 미설정 상태여야 함.

### 9) 프론트에서 API 호출 시 CORS 에러
`.env`의 `FRONTEND_URL`이 실제 프론트 포트(`http://localhost:5174`)와 일치하는지 확인.

### 10) 포트 충돌 (3000/5174/5432/6379/7880 already in use)
다른 프로세스가 점유 중. Windows: `netstat -ano | findstr :3000` 으로 PID 찾고 종료. 또는 `.env`에서 `PORT` 변경.

---

## 주요 명령어

| 명령어 | 위치 | 설명 |
|--------|------|------|
| `npm run dev` | 루트 | 프론트만 (Vite, :5174) |
| `npm run dev:backend` | 루트 | 백엔드만 (NestJS, :3000) |
| `npm run dev:all` | 루트 | 둘 다 동시에 |
| `npm run build` | 루트 | 프론트 빌드 (tsc + Vite) |
| `npm run lint` | 루트 | ESLint |
| `npm run docker:up` / `docker:down` | 루트 | 인프라 컨테이너 |
| `npx prisma migrate dev` | 루트 | DB 마이그레이션 |
| `npm run test` | `backend/` | Jest 유닛 |

---

## 기술 스택 (간단)

- **프론트**: React 19, Vite 7, TypeScript 5.9, TailwindCSS v4, Zustand, TipTap, Monaco, Socket.IO Client, LiveKit Client
- **백엔드**: NestJS 11, TypeORM, PostgreSQL 16 (pgvector), Redis, JWT + Passport(OAuth), Socket.IO, LiveKit Server SDK, Hocuspocus(Yjs), Gemini API

자세한 구조와 API 목록은 아래 문서 참조.

---

## 문서

| 문서 | 내용 |
|------|------|
| [.docs/PROJECT.md](.docs/PROJECT.md) | 프로젝트 개요, 가시성·권한 모델 |
| [.docs/TECH.md](.docs/TECH.md) | API 엔드포인트(~80개), Socket.IO 이벤트, 보안 |
| [.docs/ERD.md](.docs/ERD.md) | DB 스키마 (29개 테이블) |
| [.docs/Do.md](.docs/Do.md) | 백엔드 파트별 개발 가이드 |
| [UI.md](UI.md) | 프론트 UI 기능 목록, Mock→API 전환, Slack 정렬 로드맵 |
| [prisma/DATABASE_MIGRATION.md](prisma/DATABASE_MIGRATION.md) | DB 마이그레이션 상세 |
| [SLACK_UI_IMPROVEMENTS.md](SLACK_UI_IMPROVEMENTS.md) | Slack 정렬 UI/UX 개선 제안서 |
| [PROJECT_ISSUES.md](PROJECT_ISSUES.md) | 현재 발견된 논리적·물리적 이슈 + 수정 영향도 |
