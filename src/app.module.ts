import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { ArtistsModule } from './modules/artists/artists.module';
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { VerificationModule } from './modules/verification/verification.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { MailModule } from './modules/mail/mail.module';
import { StorageModule } from './modules/storage/storage.module';
import { GalleriesModule } from './modules/galleries/galleries.module';
import { ArtProfessionalsModule } from './modules/art-professionals/art-professionals.module';
import { CollectorsModule } from './modules/collectors/collectors.module';
import { RequestsModule } from './modules/requests/requests.module';
import { ThreadsModule } from './modules/threads/threads.module';
import { SocialModule } from './modules/social/social.module';
import { ContactModule } from './modules/contact/contact.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    MailModule,
    StorageModule,
    HealthModule,
    AuthModule,
    ArtistsModule,
    TaxonomyModule,
    OpportunitiesModule,
    VerificationModule,
    OnboardingModule,
    GalleriesModule,
    ArtProfessionalsModule,
    CollectorsModule,
    RequestsModule,
    ThreadsModule,
    SocialModule,
    ContactModule,
    AdminModule,
    NotificationsModule,
  ],
})
export class AppModule {}


