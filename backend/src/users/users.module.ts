import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TeachersController } from './teachers.controller';
import { RegisterController } from './register.controller';

@Module({
    controllers: [UsersController, TeachersController, RegisterController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule { }
