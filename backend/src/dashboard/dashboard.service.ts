import { Injectable } from '@nestjs/common'

@Injectable()
export class DashboardService {
  async getDashboard() {
    // TODO: Part 3 완료 후 groups, recentPages, myTasks, upcomingMeetings 실제 데이터로 교체
    return {
      groups: [],
      recentPages: [],
      myTasks: [],
      upcomingMeetings: [],
    }
  }
}
