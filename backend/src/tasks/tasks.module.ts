import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { TaskAssignee } from './entities/task-assignee.entity';
import { CustomFieldDefinition } from './entities/custom-field-definition.entity';
import { CustomFieldValue } from './entities/custom-field-value.entity';
import { Schedule } from './entities/schedule.entity';
import { TasksController } from './tasks.controller';
import { ProjectTasksController } from './project-tasks.controller';
import { TasksService } from './tasks.service';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { AuthModule } from '../auth/auth.module';
import { GroupMember } from '../groups/entities/group-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskAssignee,
      CustomFieldDefinition,
      CustomFieldValue,
      Schedule,
      GroupMember,
    ]),
    AuthModule,
  ],
  controllers: [TasksController, ProjectTasksController, SchedulesController],
  providers: [TasksService, SchedulesService],
  exports: [TypeOrmModule, TasksService],
})
export class TasksModule {}
