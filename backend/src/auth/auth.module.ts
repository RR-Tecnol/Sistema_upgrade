import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { PreAuthGuard } from './guards/pre-auth.guard';

@Module({
    imports: [
        UsersModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get('JWT_SECRET'),
                signOptions: { expiresIn: config.get('JWT_EXPIRES_IN') || '24h' },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, PreAuthGuard],
    exports: [AuthService, JwtStrategy, PassportModule, PreAuthGuard],
})
export class AuthModule {}
