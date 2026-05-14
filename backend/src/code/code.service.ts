import { Injectable } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import { v4 as uuidv4 } from 'uuid'
import { ExecuteCodeDto } from './dto/execute-code.dto'

const execAsync = promisify(exec)

const CODE_RUNS_DIR = path.join(process.cwd(), 'code-runs')

interface DockerConfig {
  image: string
  fileName: string
  command: string
}

const DOCKER_CONFIGS: Record<string, DockerConfig> = {
  python: {
    image: 'python:3.11-slim',
    fileName: 'main.py',
    command: 'python main.py',
  },
  javascript: {
    image: 'node:20-slim',
    fileName: 'main.js',
    command: 'node main.js',
  },
  java: {
    image: 'openjdk:17-slim',
    fileName: 'Main.java',
    command: 'sh -c "javac Main.java && java Main"',
  },
  c: {
    image: 'gcc:latest',
    fileName: 'main.c',
    command: 'sh -c "gcc main.c -o main && ./main"',
  },
  cpp: {
    image: 'gcc:latest',
    fileName: 'main.cpp',
    command: 'sh -c "g++ main.cpp -o main && ./main"',
  },
}

export interface ExecuteResult {
  output: string
  error: string | null
  executionTime: number
  iframeUrl: string | null
}

@Injectable()
export class CodeService {
  constructor() {
    if (!fs.existsSync(CODE_RUNS_DIR)) {
      fs.mkdirSync(CODE_RUNS_DIR, { recursive: true })
    }
  }

  async execute(dto: ExecuteCodeDto): Promise<ExecuteResult> {
    const { language, code } = dto
    const startTime = Date.now()

    if (language === 'html') {
      return this.handleHtml(code, startTime)
    }

    const config = DOCKER_CONFIGS[language]
    if (!config) {
      return {
        output: '',
        error: `지원하지 않는 언어: ${language}`,
        executionTime: 0,
        iframeUrl: null,
      }
    }

    return this.runDocker(config, code, startTime)
  }

  private async ensureImage(image: string): Promise<void> {
    try {
      await execAsync(`docker image inspect ${image}`)
    } catch {
      try {
        await execAsync(`docker pull ${image}`, { timeout: 120000 })
      } catch {
        throw new Error(`Docker 이미지를 준비하지 못했습니다: ${image}`)
      }
    }
  }

  private async runDocker(
    config: DockerConfig,
    code: string,
    startTime: number,
  ): Promise<ExecuteResult> {
    const runId = uuidv4()
    const tmpDir = path.join(os.tmpdir(), `syncflow-code-${runId}`)

    try {
      fs.mkdirSync(tmpDir, { recursive: true })
      fs.writeFileSync(path.join(tmpDir, config.fileName), code, 'utf8')

      try {
        await this.ensureImage(config.image)
      } catch (err: any) {
        return {
          output: '',
          error: err.message ?? 'Docker 이미지를 준비하지 못했습니다.',
          executionTime: Date.now() - startTime,
          iframeUrl: null,
        }
      }

      const dockerPath = this.toDockerPath(tmpDir)
      const cmd = [
        'docker run --rm',
        '--network none',
        '--cpus=1',
        '-m 256m',
        '--security-opt no-new-privileges',
        `-v "${dockerPath}:/code"`,
        '-w /code',
        config.image,
        config.command,
      ].join(' ')

      try {
        const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 })
        return {
          output: stdout,
          error: stderr || null,
          executionTime: Date.now() - startTime,
          iframeUrl: null,
        }
      } catch (err: any) {
        const executionTime = Date.now() - startTime
        if (err.killed) {
          return {
            output: err.stdout ?? '',
            error: '실행 시간 초과 (30초)',
            executionTime,
            iframeUrl: null,
          }
        }
        // 컴파일/런타임 에러 — stdout/stderr 모두 반환
        return {
          output: err.stdout ?? '',
          error: err.stderr || err.message || '실행 실패',
          executionTime,
          iframeUrl: null,
        }
      }
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      } catch {
        // 정리 실패는 무시
      }
    }
  }

  private handleHtml(code: string, startTime: number): ExecuteResult {
    const runId = uuidv4()
    const runDir = path.join(CODE_RUNS_DIR, runId)
    try {
      fs.mkdirSync(runDir, { recursive: true })
      fs.writeFileSync(path.join(runDir, 'index.html'), code, 'utf8')
    } catch (err: any) {
      return {
        output: '',
        error: `HTML 파일 저장 실패: ${err.message}`,
        executionTime: Date.now() - startTime,
        iframeUrl: null,
      }
    }
    return {
      output: '',
      error: null,
      executionTime: Date.now() - startTime,
      iframeUrl: `/code-runs/${runId}/index.html`,
    }
  }

  // Windows 경로를 Docker Desktop 호환 경로로 변환
  // C:\Users\... → /c/Users/...
  private toDockerPath(hostPath: string): string {
    return hostPath
      .replace(/\\/g, '/')
      .replace(/^([A-Za-z]):/, (_, d: string) => `/${d.toLowerCase()}`)
  }
}
