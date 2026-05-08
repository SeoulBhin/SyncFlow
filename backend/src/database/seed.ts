/**
 * 개발/시연용 테스트 계정 시드 스크립트
 * 실행: npm run seed (backend 디렉토리에서)
 * 이미 동일 email이 존재하면 건너뜁니다.
 */
import * as path from 'path'
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })

import { DataSource } from 'typeorm'
import * as bcrypt from 'bcrypt'

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME || 'syncflow',
  password: process.env.DATABASE_PASSWORD || 'syncflow1234',
  database: process.env.DATABASE_NAME || 'syncflow',
  synchronize: false,
})

interface SeedUser {
  email: string
  password: string
  name: string
}

const TEST_USERS: SeedUser[] = [
  { email: 'tester1@test.com', password: 'test1234', name: 'Tester One' },
]

async function seed() {
  await dataSource.initialize()
  console.log('✓ DB 연결 성공')

  for (const u of TEST_USERS) {
    const rows: { id: string }[] = await dataSource.query(
      'SELECT id FROM users WHERE email = $1',
      [u.email],
    )

    const passwordHash = await bcrypt.hash(u.password, 10)

    if (rows.length > 0) {
      // 이미 존재하면 password_hash와 email_verified만 갱신 (로그인 보장)
      await dataSource.query(
        `UPDATE users SET password_hash = $1, email_verified = true, updated_at = NOW()
         WHERE email = $2`,
        [passwordHash, u.email],
      )
      console.log(`  updated ${u.email} — 비밀번호 재설정 (id: ${rows[0].id})`)
      continue
    }

    await dataSource.query(
      `INSERT INTO users
         (id, email, password_hash, name, role, email_verified, created_at, updated_at)
       VALUES
         (gen_random_uuid(), $1, $2, $3, 'member', true, NOW(), NOW())`,
      [u.email, passwordHash, u.name],
    )
    console.log(`  created ${u.email} (name: ${u.name})`)
  }

  await dataSource.destroy()
  console.log('✓ Seed 완료')
}

seed().catch((err: unknown) => {
  console.error('Seed 실패:', err)
  process.exit(1)
})
