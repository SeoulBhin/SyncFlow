# DB Migration

DB경로 설정은 .env.example참고

본인의 로컬 PostgreSQL 정보에 맞게 수정

- .env 추가 -
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/syncflow?schema=public"

기존 postgresql에서 pgvector확장필요

## 1. 의존성 패키지 설치

npm install

## 2. 기존 마이그레이션 이력을 내 로컬 DB에 모두 반영 (최초 실행)

npx prisma migrate dev

## 3. DB 구조 변경 시 (추가/수정/삭제)

모든 데이터베이스 구조 변경은 prisma/schema.prisma 파일을 수정하는 것부터 시작.

수정: schema.prisma 파일에서 테이블을 추가하거나 컬럼을 수정합니다.

명령어 실행: 수정 후 터미널에서 아래 명령어를 실행하여 변경 이력을 생성.

수정 시 : npx prisma migrate dev --name (변경내용_설명)

ex ) users 테이블에 나이(age) 컬럼을 추가했을 때:

npx prisma migrate dev --name add_user_age

## 마이그레이션 관련 주의사항

Schema 변경 시: 팀원이 schema.prisma를 수정하여 푸시했다면, 반드시 git pull 후 npx prisma migrate dev를 다시 실행 해야함.





