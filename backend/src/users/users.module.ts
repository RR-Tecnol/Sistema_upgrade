import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TeachersController } from './teachers.controller';
import { RegisterController } from './register.controller';
import { MailModule } from '../mail/mail.module';

@Module({
    imports: [MailModule],
    controllers: [UsersController, TeachersController, RegisterController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule { }
