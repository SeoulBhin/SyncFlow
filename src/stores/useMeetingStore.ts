import { create } from 'zustand'
import { MOCK_MEETINGS } from '@/constants'

export type MeetingViewStatus = 'idle' | 'in-meeting'

interface MeetingParticipant {
  id: string
  name: string
  position: string
  isMuted: boolean
  isSpeaking: boolean
}

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

  startMeeting: (meetingId: string, title: string, channelName: string) => void
  endMeeting: () => void
  toggleMute: () => void
  toggleScreenShare: () => void
  toggleSTT: () => void
  toggleRecording: () => void
  setActiveTab: (tab: 'transcript' | 'notes' | 'chat') => void
  tick: () => void
}

export const useMeetingStore = create<MeetingState>((set) => ({
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

  startMeeting: (meetingId, title, channelName) => {
    const meeting = MOCK_MEETINGS.find((m) => m.id === meetingId)
    const participants: MeetingParticipant[] = (meeting?.participants ?? []).map((p, i) => ({
      ...p,
      isMuted: false,
      isSpeaking: i === 0,
    }))

    set({
      status: 'in-meeting',
      activeMeetingId: meetingId,
      meetingTitle: title,
      channelName,
      elapsedSeconds: 0,
      participants,
      transcript: meeting?.transcript ?? [],
      aiNotes: meeting?.summary ? [meeting.summary] : [],
      actionItems: meeting?.actionItems ?? [],
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

  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  toggleScreenShare: () => set((s) => ({ isScreenSharing: !s.isScreenSharing })),
  toggleSTT: () => set((s) => ({ sttEnabled: !s.sttEnabled })),
  toggleRecording: () => set((s) => ({ isRecording: !s.isRecording })),
  setActiveTab: (tab) => set({ activeTab: tab }),
  tick: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),
}))
