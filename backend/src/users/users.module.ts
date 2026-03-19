import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RegisterController } from './register.controller';

@Module({
    controllers: [UsersController, RegisterController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule { }
