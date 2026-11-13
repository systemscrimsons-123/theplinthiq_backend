import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;   // user UUID
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'change_me',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email1: true,
        role: true,
        status: true,
        verificationStatus: true,
      },
    });

    if (!user || user.status === 'inactive') {
      throw new UnauthorizedException('Account is inactive or suspended.');
    }

    // Auto-heal account if status was erroneously set to pending_verification
    if (user.status === 'pending_verification') {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: 'active' },
      });
      user.status = 'active';
    }

    return user; // attached to req.user
  }
}

