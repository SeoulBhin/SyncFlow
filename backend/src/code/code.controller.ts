import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { CodeService } from './code.service'
import { ExecuteCodeDto } from './dto/execute-code.dto'

@Controller('code')
export class CodeController {
  constructor(private readonly codeService: CodeService) {}

  @Post('execute')
  @HttpCode(200)
  execute(@Body() dto: ExecuteCodeDto) {
    return this.codeService.execute(dto)
  }
}
