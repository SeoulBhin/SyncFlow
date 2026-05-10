# DB Migration (Prisma)

SyncFlow 의 DB 스키마는 **Prisma 마이그레이션**으로 관리됩니다.
NestJS 백엔드는 TypeORM 으로 쿼리를 실행하지만, **테이블 생성·변경 이력은 Prisma 가 담당**합니다.

> 즉, `backend/.env` 의 `TYPEORM_SYNC=false` 가 정상이며,
> 새 팀원은 이 문서대로 한 번만 마이그레이션을 실행하면 됩니다.

---

## 사전 준비

다음이 모두 동작 중이어야 합니다.

```bash
# 1) Docker Desktop 실행 중
# 2) PostgreSQL + Redis 컨테이너 실행
npm run docker:up

# 3) 컨테이너 상태 확인 — syncflow-postgres 가 Up 상태여야 함
docker ps
```

---

## 1. 환경변수 설정 (backend/.env)

> ⚠️ Prisma 의 `DATABASE_URL` 은 **루트 `.env` 가 아니라 `backend/.env` 에** 설정합니다.
> `prisma.config.ts` 의 4번째 라인에서 `path: "backend/.env"` 로 지정되어 있기 때문입니다.

`backend/.env` 가 없으면 `backend/.env.example` 을 복사해서 만드세요.

```bash
cp backend/.env.example backend/.env
```

`backend/.env` 안에 다음 항목이 모두 들어 있어야 합니다.

```env
# NestJS(TypeORM) 가 사용
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=syncflow
DATABASE_PASSWORD=syncflow1234
DATABASE_NAME=syncflow

# Prisma 가 사용 — 위 값들과 일치시킬 것
DATABASE_URL=postgresql://syncflow:syncflow1234@localhost:5432/syncflow?schema=public
```

본인의 로컬 PostgreSQL 정보가 다르다면 `USER:PASSWORD@HOST:PORT/DATABASE` 부분을 맞춰 수정하세요.

> ⚠️ `backend/.env` 는 절대 커밋하지 말 것. `backend/.gitignore` 에 등록되어 있는지 확인하세요.

---

## 2. pgvector 확장 활성화 (최초 1회)

AI RAG 파이프라인이 768차원 임베딩을 저장하려면 `vector` 확장이 필요합니다.

```bash
docker exec -it syncflow-postgres psql -U syncflow -d syncflow -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

성공 시 `CREATE EXTENSION` 또는 `NOTICE: extension "vector" already exists` 가 출력됩니다.

---

## 3. 의존성 설치

루트에서:

```bash
npm install
```

`@prisma/client` 와 `prisma` CLI 가 설치되며, postinstall 훅이 자동으로 `prisma generate` 를 실행해 클라이언트를 생성합니다.

---

## 4. 마이그레이션 실행 (최초 1회)

`prisma/migrations/` 안의 모든 마이그레이션 이력을 로컬 DB 에 반영합니다.

```bash
npx prisma migrate dev
```

- 처음 실행 시: 모든 테이블이 생성됩니다.
- 이미 일부 적용된 상태에서 실행 시: 미적용된 마이그레이션만 추가로 적용됩니다.
- 새 팀원이 처음 셋업할 때 이 명령 한 번이면 됩니다.

### 검증

테이블 29개가 생성되었는지 확인:

```bash
docker exec -it syncflow-postgres psql -U syncflow -d syncflow -c "\dt"
```

`users`, `oauth_accounts`, `groups`, `projects`, `pages`, `tasks`, `meetings`, `document_embeddings` 등이 보이면 성공.

---

## 5. 스키마 변경 시 (개발 중)

DB 구조 변경은 **항상** `prisma/schema.prisma` 파일을 수정하는 것부터 시작합니다.

### 5-1. schema.prisma 수정

예: `users` 테이블에 `age` 컬럼 추가
```prisma
model User {
  id    String  @id @default(uuid())
  email String  @unique
  age   Int?    // 새 컬럼
  // ...
}
```

### 5-2. 마이그레이션 생성 및 적용

```bash
npx prisma migrate dev --name add_user_age
```

- `prisma/migrations/<timestamp>_add_user_age/migration.sql` 파일이 자동 생성됩니다.
- 로컬 DB 에 즉시 적용됩니다.
- Prisma Client 가 자동 재생성됩니다.

### 5-3. 커밋

```bash
git add prisma/schema.prisma prisma/migrations/<timestamp>_add_user_age
git commit -m "feat(db): add user age column"
```

---

## 6. 다른 팀원이 schema 를 변경한 경우

git pull 후 반드시 마이그레이션을 다시 적용하세요.

```bash
git pull
npx prisma migrate dev
```

이 명령은 미적용된 새 마이그레이션을 감지해 자동으로 적용합니다.

---

## 자주 나는 에러

### `error: relation "users" does not exist`
→ 마이그레이션이 아직 실행되지 않은 상태. **4단계** 다시 실행.

### `Environment variable not found: DATABASE_URL`
또는 `Error: The datasource.url property is required in your Prisma config file when using prisma migrate dev.`
→ `backend/.env` 가 없거나 `DATABASE_URL` 이 비어 있음. **1단계** 확인.
   (prisma.config.ts 가 backend/.env 를 읽으므로 루트 .env 가 아니라 backend/.env 에 넣어야 함.)

### `Can't reach database server at localhost:5432`
→ PostgreSQL 컨테이너가 안 떠 있음. `npm run docker:up` 후 `docker ps` 로 확인.

### `extension "vector" is not available`
→ pgvector 가 활성화되지 않음. **2단계** 다시 실행.
   (`pgvector/pgvector:pg16` 이미지를 쓰고 있는지 docker-compose.yml 확인.)

### `Migration ... failed to apply cleanly to the shadow database`
→ 마이그레이션 충돌. 개발 단계라면 다음 명령으로 DB 를 리셋하고 재적용:
```bash
npx prisma migrate reset
```
⚠️ **모든 데이터가 삭제**됩니다. 운영 환경에서는 절대 사용 금지.

---

## 운영 배포 시

`prisma migrate dev` 는 개발 전용입니다.
프로덕션 배포에서는:

```bash
npx prisma migrate deploy
```

이 명령은 마이그레이션 파일만 적용하고, schema drift 감지나 dev 헬퍼 동작은 하지 않습니다.

---

# 추가 가이드

> **2026-05-11 통합 테스트 회고를 반영해 추가된 섹션입니다. 위 본문은 기본 워크플로, 아래는 팀 협업·통합 시 자주 만나는 문제와 대응법입니다.**

## A. 팀 협업 워크플로 — schema 변경 시 절대 규칙

**Prisma schema 를 수정한 사람이 마이그레이션 파일까지 같이 커밋해야 한다.**

흔한 실수: `schema.prisma` 의 모델·필드만 수정하고 `npx prisma migrate dev --name ...` 명령을 실행하지 않은 채 커밋·푸시. 결과:
- 본인 PC: schema 수정 + DB 변경이 동시에 적용된 상태라 정상 동작
- 다른 팀원 PC: schema 만 받고 마이그레이션은 없으므로 DB 와 schema 가 어긋남
- 통합 환경에서 `column ... does not exist` / drift 감지 같은 에러 발생

### 올바른 흐름
```bash
# 1) schema.prisma 수정 (예: User 에 birthYear 컬럼 추가)
# 2) 마이그레이션 생성 + 적용 (반드시 같이 실행)
npx prisma migrate dev --name add_user_birth_year

# 3) 둘 다 커밋
git add prisma/schema.prisma prisma/migrations/<timestamp>_add_user_birth_year
git commit -m "feat(db): add user birth_year"
git push
```

### 팀원이 schema 변경한 PR 을 받았을 때
```bash
git pull
npx prisma migrate dev          # 새 마이그레이션 자동 적용
npx prisma generate             # Prisma Client 재생성 (postinstall 이 자동 실행하지만 명시적으로도 가능)
```

---

## B. TypeORM Entity 와 Prisma schema 의 동기화 책임

SyncFlow 는 **이중 ORM 구조**입니다:
- **Prisma**: DB 스키마 마이그레이션 관리 (CREATE TABLE, ALTER TABLE)
- **TypeORM**: 런타임 쿼리 실행 (NestJS service 에서 SELECT/INSERT/UPDATE)

두 ORM이 **같은 테이블을 가리키지만 정의는 별도**입니다. 그래서 한쪽만 수정하면 통합 시 깨집니다.

### 새 모델 / 컬럼 추가 시 체크리스트
- [ ] `prisma/schema.prisma` 에 model 추가 또는 field 추가
- [ ] `npx prisma migrate dev --name ...` 실행 (마이그레이션 파일 생성)
- [ ] `backend/src/<module>/entities/<name>.entity.ts` 에 TypeORM `@Entity` 작성 (테이블명·컬럼명 일치)
- [ ] 컬럼명 매핑: Prisma `@map("snake_case")` ↔ TypeORM `@Column({ name: 'snake_case' })`
- [ ] 통합 빌드(`npm run start:dev`) 후 해당 테이블에 SELECT 시도해 에러 없음 확인
- [ ] 두 파일 모두 커밋

### 자주 나는 불일치 패턴
| 증상 | 원인 |
|---|---|
| `column "X" does not exist` | Prisma schema 에는 있지만 마이그레이션 파일에 누락 — **A 섹션** 참고 |
| `relation "table_name" does not exist` | TypeORM Entity 만 만들고 Prisma schema 에는 모델이 없음 — schema 에 model 추가 후 마이그레이션 |
| Prisma 타입과 TypeORM 컬럼 타입 불일치 | `@db.VarChar(255)` 와 TypeORM `@Column({ type: 'varchar', length: 255 })` 등 길이·타입 일치 필요 |
| FK 동작 불일치 | Prisma `onDelete: Cascade` ↔ TypeORM `@JoinColumn`/`@ManyToOne({ onDelete: 'CASCADE' })` 일치시킬 것 |

---

## C. 마이그레이션 누락 감지 — 커밋 전 자가 점검

본인 PC 에서 `schema.prisma` 와 실제 DB 가 일치하는지 확인:

```bash
npx prisma migrate status
```

출력 예시:
- `Database schema is up to date!` → 안전, 푸시 가능
- `Following migration have not yet been applied` → 새 마이그레이션이 있는데 본인 DB 미반영. `migrate dev` 로 적용
- `The database schema is not in sync with your migration history. (Drift detected)` → schema 만 수정하고 마이그레이션 안 만든 상태. **푸시 금지**, 마이그레이션 생성 후 푸시

### CI 에서 검증 (선택)
GitHub Actions 등에서 PR 시 자동 점검하려면:
```bash
npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --exit-code
```
diff 가 있으면 exit code 2 → CI 실패. PR 머지 전에 마이그레이션 누락을 강제로 잡을 수 있습니다.

---

## D. 통합 빌드 전 체크리스트 (PR 머지 전)

다른 팀원 PR 받기 전에 본인 환경에서 이걸 한번 돌리면 통합 사고 90% 예방:

```bash
# 1) 의존성 동기화 (양쪽 다)
npm install
cd backend && npm install && cd ..

# 2) DB 컨테이너 실행 + 마이그레이션 동기화
npm run docker:up
npx prisma migrate dev

# 3) 백엔드 부팅 (TypeORM 이 schema 와 호환되는지 확인)
cd backend && npm run start:dev

# 4) API 1개라도 호출 — 회원가입 또는 로그인이 빠름
#    OAuth 콜백까지 도는지 확인하면 oauth_accounts 컬럼 누락 같은 이슈를 즉시 발견
```

부팅이 성공하고 핵심 API 1~2개가 동작하면 통합 안전.

---

## E. 자주 나는 추가 에러 (본 프로젝트에서 실제 발생)

### `Drift detected: Your database schema is not in sync`
→ TypeORM 또는 외부에서 직접 만든 변경 사항(예: `CREATE EXTENSION uuid-ossp`, `vector`)을 Prisma 가 자기가 한 일이 아니라고 판단.
- 데이터가 없으면: `npx prisma migrate reset` (모든 데이터 삭제)
- 데이터를 보존하려면: `prisma/schema.prisma` 의 datasource 블록에 `extensions = [pgcrypto, vector, uuid_ossp(map: "uuid-ossp")]` 추가하고 `npx prisma migrate dev --name add_extensions`

### `Error: The datasource.url property is required in your Prisma config file`
→ `prisma.config.ts` 가 `backend/.env` 를 읽도록 설정되어 있는데 그 파일에 `DATABASE_URL` 이 비어있음.
- `backend/.env` 에 `DATABASE_URL=postgresql://syncflow:syncflow1234@localhost:5432/syncflow?schema=public` 추가
- (루트 `.env` 가 아니라 `backend/.env` 임에 주의)

### `extension "vector" already exists` 가 NOTICE 로 떠도 정상
→ 무해함. `IF NOT EXISTS` 가이드대로 동작한 것.

### Prisma Client 가 outdated 라고 뜸
→ `npx prisma generate` 한 번 실행. 또는 `npm install` (postinstall 훅이 자동 실행).

---

## F. SyncFlow 현재 schema 상태 (2026-05-11 기준)

`schema.prisma` 에 정의된 모델 22개:
- User, OauthAccount, UserSetting
- Group, GroupMember, InviteCode, Project, Page, PageVersion
- Task, Schedule
- Channel, ChannelMember, Message, MessageReaction
- AiConversation, AiMessage, Embedding
- Subscription, Payment, Notification, FileUpload

**ERD.md 기준 누락된 도메인 (추가 필요)**:
- 회의 AI: `meetings`, `meeting_participants`, `meeting_transcripts`, `meeting_action_items`, `meeting_summaries` (김봉만의 TypeORM Entity 가 사용 중이지만 Prisma 미반영)
- 조직: `organizations`
- 프로젝트 멤버: `project_members`
- 작업 보조: `task_assignees`, `custom_field_definitions`, `custom_field_values`

해당 도메인 작업자가 schema.prisma 에 추가 후 `npx prisma migrate dev --name add_<domain>` 으로 마이그레이션 파일 생성 + 커밋해야 합니다.
