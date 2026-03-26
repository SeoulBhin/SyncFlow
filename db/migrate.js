const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function migrate() {
  const client = await pool.connect();

  try {
    // migration 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE,
        run_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    const executedRes = await client.query(`SELECT name FROM migrations`);
    const executed = executedRes.rows.map(r => r.name);

    const dir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(dir).sort();

    for (const file of files) {
      if (executed.includes(file)) {
        console.log(`⏭️ skip ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(dir, file), 'utf-8');

      console.log(`🚀 실행: ${file}`);

      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        `INSERT INTO migrations(name) VALUES($1)`,
        [file]
      );
      await client.query('COMMIT');

      console.log(`완료: ${file}`);
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('에러:', err);
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
