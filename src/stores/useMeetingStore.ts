import { create } from 'zustand'
import { apiJson } from '@/lib/api'
import type {
  ApiMeeting,
  ApiMeetingActionItem,
  ApiMeetingSummary,
  ApiMeetingTranscript,
  EndMeetingResponse,
  UploadAudioResponse,
} from '@/types'

export type MeetingViewStatus = 'idle' | 'in-meeting'

interface MeetingParticipant {
  id: string
  name: string
  position: string
  isMuted: boolean
  isSpeaking: boolean
}

// UI 표시용 트랜스크립트 (백엔드 응답을 변환)
interface TranscriptEntry {
  speaker: string
  text: string
  time: string
}

interface ActionItem {
  id: string
  title: string
  assignee: string
  done: boolean
}

interface MeetingState {
  // ── 진행 중인 회의 (UI 상태) ───────────────────────────────────────────────
  status: MeetingViewStatus
  activeMeetingId: string | null
  meetingTitle: string
  channelName: string
  elapsedSeconds: number
  participants: MeetingParticipant[]
  transcript: TranscriptEntry[]
  aiNotes: string[]
  actionItems: ActionItem[]
  isMuted: boolean
  isScreenSharing: boolean
  sttEnabled: boolean
  isRecording: boolean
  activeTab: 'transcript' | 'notes' | 'chat'

  // ── 서버 데이터 캐시 ───────────────────────────────────────────────────────
  meetings: ApiMeeting[]
  currentMeeting: ApiMeeting | null
  currentTranscripts: ApiMeetingTranscript[]
  currentSummary: ApiMeetingSummary | null
  currentActionItems: ApiMeetingActionItem[]
  isLoading: boolean
  uploadProgress: number  // 0-100, 오디오 업로드 진행률
  error: string | null

  // ── 로컬 UI 액션 ───────────────────────────────────────────────────────────
  startMeeting: (meetingId: string, title: string, channelName: string) => void
  endMeeting: () => void
  toggleMute: () => void
  toggleScreenShare: () => void
  toggleSTT: () => void
  toggleRecording: () => void
  setActiveTab: (tab: 'transcript' | 'notes' | 'chat') => void
  tick: () => void

  // 실시간 STT 세그먼트를 store transcript에 즉시 반영 (Gateway 브로드캐스트 수신 시)
  addRealtimeTranscript: (entry: ApiMeetingTranscript) => void

  // ── API 액션 ───────────────────────────────────────────────────────────────
  createMeeting: (title: string, opts?: { groupId?: string; projectId?: string }) => Promise<ApiMeeting>
  uploadAudio: (meetingId: string, file: File, speakerMap?: Record<string, string>) => Promise<UploadAudioResponse>
  finalizeMeeting: (meetingId: string) => Promise<EndMeetingResponse>
  loadMeeting: (meetingId: string) => Promise<void>
  loadMyMeetings: () => Promise<void>
  loadMeetingsByProject: (projectId: string) => Promise<void>
  updateActionItem: (
    meetingId: string,
    actionItemId: string,
    data: Partial<Pick<ApiMeetingActionItem, 'title' | 'assignee' | 'dueDate'>>,
  ) => Promise<ApiMeetingActionItem>
  confirmActionItems: (meetingId: string, actionItemIds: string[]) => Promise<ApiMeetingActionItem[]>
}

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

// MOCK 채널 ID("ch1" 등)는 UUID 컬럼에 INSERT 시 Postgres 500 유발
// 실제 DB UUID가 아닌 값은 서버로 보내지 않음 → group_id NULL로 회의 생성
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function asUuid(v?: string | null): string | undefined {
  return v && UUID_RE.test(v) ? v : undefined
}

function formatStartTime(seconds: number | null): string {
  if (seconds == null || isNaN(seconds)) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function toTranscriptEntries(items: ApiMeetingTranscript[]): TranscriptEntry[] {
  return items.map((t) => ({
    speaker: t.speaker ?? '발화자',
    text: t.text,
    time: formatStartTime(t.startTime),
  }))
}

function toActionItems(items: ApiMeetingActionItem[]): ActionItem[] {
  return items.map((a) => ({
    id: a.id,
    title: a.title,
    assignee: a.assignee ?? '',
    done: a.confirmed,
  }))
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useMeetingStore = create<MeetingState>((set, get) => ({
  // 초기 상태
  status: 'idle',
  activeMeetingId: null,
  meetingTitle: '',
  channelName: '',
  elapsedSeconds: 0,
  participants: [],
  transcript: [],
  aiNotes: [],
  actionItems: [],
  isMuted: false,
  isScreenSharing: false,
  sttEnabled: false,
  isRecording: false,
  activeTab: 'transcript',

  meetings: [],
  currentMeeting: null,
  currentTranscripts: [],
  currentSummary: null,
  currentActionItems: [],
  isLoading: false,
  uploadProgress: 0,
  error: null,

  // ── 로컬 UI 액션 ───────────────────────────────────────────────────────────

  startMeeting: (meetingId, title, channelName) => {
    set({
      status: 'in-meeting',
      activeMeetingId: meetingId,
      meetingTitle: title,
      channelName,
      elapsedSeconds: 0,
      participants: [],
      transcript: [],
      aiNotes: [],
      actionItems: [],
      isMuted: false,
      isScreenSharing: false,
      sttEnabled: false,
      isRecording: false,
      activeTab: 'transcript',
    })
  },

  endMeeting: () =>
    set({
      status: 'idle',
      activeMeetingId: null,
      meetingTitle: '',
      channelName: '',
      elapsedSeconds: 0,
      participants: [],
      transcript: [],
      aiNotes: [],
      actionItems: [],
      isMuted: false,
      isScreenSharing: false,
      isRecording: false,
    }),

  addRealtimeTranscript: (entry) =>
    set((s) => {
      const next = [...s.currentTranscripts, entry]
      return {
        currentTranscripts: next,
        transcript: toTranscriptEntries(next),
      }
    }),

  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  toggleScreenShare: () => set((s) => ({ isScreenSharing: !s.isScreenSharing })),
  toggleSTT: () => set((s) => ({ sttEnabled: !s.sttEnabled })),
  toggleRecording: () => set((s) => ({ isRecording: !s.isRecording })),
  setActiveTab: (tab) => set({ activeTab: tab }),
  tick: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),

  // ── API 액션 ───────────────────────────────────────────────────────────────

  createMeeting: async (title, opts) => {
    const meeting = await apiJson<ApiMeeting>('/api/meetings', {
      method: 'POST',
      body: JSON.stringify({
        title,
        groupId: asUuid(opts?.groupId),
        projectId: asUuid(opts?.projectId),
      }),
    })
    set((s) => ({
      meetings: [meeting, ...s.meetings.filter((m) => m.id !== meeting.id)],
      currentMeeting: meeting,
    }))
    return meeting
  },

  uploadAudio: (meetingId, file, speakerMap) => {
    const form = new FormData()
    form.append('audio', file)
    if (speakerMap && Object.keys(speakerMap).length > 0) {
      form.append('speakerMap', JSON.stringify(speakerMap))
    }

    return new Promise<UploadAudioResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `/api/meetings/${meetingId}/audio`)

      const token = localStorage.getItem('accessToken')
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          set({ uploadProgress: Math.round((e.loaded / e.total) * 100) })
        }
      })

      xhr.addEventListener('load', () => {
        set({ uploadProgress: 0 })
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText) as UploadAudioResponse
            set((s) => ({
              currentTranscripts: [...s.currentTranscripts, ...data.transcripts],
              transcript: toTranscriptEntries([
                ...s.currentTranscripts,
                ...data.transcripts,
              ]),
            }))
            resolve(data)
          } catch {
            reject(new Error('서버 응답 파싱 실패'))
          }
        } else {
          reject(new Error(xhr.responseText || `오디오 업로드 실패 (${xhr.status})`))
        }
      })

      xhr.addEventListener('error', () => {
        set({ uploadProgress: 0 })
        reject(new Error('네트워크 오류로 업로드에 실패했습니다'))
      })

      xhr.addEventListener('abort', () => {
        set({ uploadProgress: 0 })
        reject(new Error('업로드가 취소되었습니다'))
      })

      xhr.send(form)
    })
  },

  finalizeMeeting: async (meetingId) => {
    const data = await apiJson<EndMeetingResponse>(
      `/api/meetings/${meetingId}/end`,
      { method: 'PUT' },
    )
    set((s) => ({
      currentMeeting: data.meeting,
      currentSummary: data.summary,
      currentActionItems: data.actionItems,
      meetings: s.meetings.map((m) => (m.id === data.meeting.id ? data.meeting : m)),
      aiNotes: data.summary ? [data.summary.summary] : [],
      actionItems: toActionItems(data.actionItems),
    }))
    return data
  },

  loadMeeting: async (meetingId) => {
    set({ isLoading: true, error: null })
    try {
      const [meeting, transcripts, summary, actionItems] = await Promise.all([
        apiJson<ApiMeeting>(`/api/meetings/${meetingId}`),
        apiJson<ApiMeetingTranscript[]>(`/api/meetings/${meetingId}/transcript`),
        apiJson<ApiMeetingSummary | null>(`/api/meetings/${meetingId}/summary`),
        apiJson<ApiMeetingActionItem[]>(`/api/meetings/${meetingId}/action-items`),
      ])
      set({
        currentMeeting: meeting,
        currentTranscripts: transcripts,
        currentSummary: summary,
        currentActionItems: actionItems,
        transcript: toTranscriptEntries(transcripts),
        aiNotes: summary ? [summary.summary] : [],
        actionItems: toActionItems(actionItems),
        isLoading: false,
      })
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : '회의를 불러올 수 없습니다',
      })
    }
  },

  loadMyMeetings: async () => {
    set({ isLoading: true, error: null })
    try {
      const meetings = await apiJson<ApiMeeting[]>('/api/meetings/my')
      set({ meetings, isLoading: false })
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : '회의 목록을 불러올 수 없습니다',
      })
    }
  },

  loadMeetingsByProject: async (projectId) => {
    set({ isLoading: true, error: null })
    try {
      const meetings = await apiJson<ApiMeeting[]>(
        `/api/meetings/project/${projectId}`,
      )
      set({ meetings, isLoading: false })
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : '회의 목록을 불러올 수 없습니다',
      })
    }
  },

  updateActionItem: async (meetingId, actionItemId, data) => {
    const updated = await apiJson<ApiMeetingActionItem>(
      `/api/meetings/${meetingId}/action-items/${actionItemId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    )
    const next = get().currentActionItems.map((a) =>
      a.id === actionItemId ? updated : a,
    )
    set({
      currentActionItems: next,
      actionItems: toActionItems(next),
    })
    return updated
  },

  confirmActionItems: async (meetingId, actionItemIds) => {
    const confirmed = await apiJson<ApiMeetingActionItem[]>(
      `/api/meetings/${meetingId}/action-items/confirm`,
      {
        method: 'POST',
        body: JSON.stringify({ actionItemIds }),
      },
    )
    const confirmedIds = new Set(confirmed.map((a) => a.id))
    const next = get().currentActionItems.map((a) =>
      confirmedIds.has(a.id) ? { ...a, confirmed: true } : a,
    )
    set({
      currentActionItems: next,
      actionItems: toActionItems(next),
    })
    return confirmed
  },
}))
