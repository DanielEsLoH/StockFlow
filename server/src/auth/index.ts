export { AuthModule } from './auth.module';
export { AuthService } from './auth.service';
export type { AuthUser, AuthResponse, LogoutResponse } from './auth.service';
export { AuthController } from './auth.controller';
export { LoginDto, RegisterDto, RefreshTokenDto } from './dto';

// Strategies
export { JwtStrategy, JwtRefreshStrategy } from './strategies';

// Guards
export { JwtAuthGuard, RolesGuard } from './guards';

// Types
export type { JwtPayload, RequestUser } from './types';
