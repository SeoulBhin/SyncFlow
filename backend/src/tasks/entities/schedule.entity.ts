import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

export type ScheduleRepeat = 'none' | 'daily' | 'weekly' | 'monthly'

@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 300 })
  title: string

  @Column({ type: 'text', nullable: true })
  description: string | null

  // 시작 일시 (필수)
  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt: Date

  // 종료 일시 (없으면 당일 종료)
  @Column({ name: 'end_at', type: 'timestamptz', nullable: true })
  endAt: Date | null

  // 하루 종일 여부
  @Column({ name: 'all_day', default: false })
  allDay: boolean

  // 반복 설정
  @Column({ type: 'varchar', length: 20, default: 'none' })
  repeat: ScheduleRepeat

  // 색상 (UI 표시용)
  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string | null

  // 위치
  @Column({ type: 'varchar', length: 300, nullable: true })
  location: string | null

  // 생성자
  @Index()
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null

  // 참여자 userId 배열 (JSON)
  @Column({ type: 'jsonb', nullable: true })
  attendees: string[] | null

  // 소속 그룹
  @Index()
  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId: string | null

  // 연결된 프로젝트
  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null

  // 연결된 태스크
  @Column({ name: 'task_id', type: 'uuid', nullable: true })
  taskId: string | null

  // 연결된 회의
  @Column({ name: 'meeting_id', type: 'uuid', nullable: true })
  meetingId: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
