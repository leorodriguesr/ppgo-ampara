-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'POLICE');

-- CreateEnum
CREATE TYPE "ProtectionOrderStatus" AS ENUM ('DRAFT', 'AWAITING_PAIRING', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PairingTokenStatus" AS ENUM ('PENDING', 'REDEEMED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ACTIVE', 'REVOKED', 'LOST');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'RESOLVED', 'FALSE_POSITIVE');

-- CreateEnum
CREATE TYPE "GeofenceState" AS ENUM ('SAFE', 'PENDING_VIOLATION', 'VIOLATING', 'PENDING_SAFE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('USER_LOGIN', 'USER_LOGOUT', 'VICTIM_CREATED', 'VICTIM_UPDATED', 'INMATE_CREATED', 'INMATE_UPDATED', 'PROTECTION_ORDER_CREATED', 'PROTECTION_ORDER_UPDATED', 'PROTECTION_ORDER_STATUS_CHANGED', 'PAIRING_TOKEN_GENERATED', 'PAIRING_TOKEN_REDEEMED', 'PAIRING_TOKEN_REVOKED', 'DEVICE_REVOKED', 'PROXIMITY_CHECKED', 'ALERT_OPENED', 'ALERT_REFRESHED', 'ALERT_RESOLVED', 'EXTERNAL_API_ERROR', 'EMERGENCY_TRIGGERED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'POLICE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "victim" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "document" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "victim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inmate" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "externalInmateId" TEXT NOT NULL,
    "document" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inmate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protection_order" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "victimId" TEXT NOT NULL,
    "inmateId" TEXT NOT NULL,
    "radiusMeters" INTEGER NOT NULL,
    "status" "ProtectionOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "judicialRef" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "geofenceState" "GeofenceState" NOT NULL DEFAULT 'SAFE',
    "pendingCount" INTEGER NOT NULL DEFAULT 0,
    "lastCheckAt" TIMESTAMP(3),
    "lastDistanceM" DOUBLE PRECISION,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "protection_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pairing_token" (
    "id" TEXT NOT NULL,
    "protectionOrderId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "PairingTokenStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pairing_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "protectionOrderId" TEXT NOT NULL,
    "status" "DeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "platform" TEXT NOT NULL,
    "pushToken" TEXT,
    "deviceTokenHash" TEXT NOT NULL,
    "appVersion" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "pairedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "victim_location" (
    "id" TEXT NOT NULL,
    "protectionOrderId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracyMeters" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'APP',

    CONSTRAINT "victim_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "protectionOrderId" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "triggerDistanceM" DOUBLE PRECISION NOT NULL,
    "lastDistanceM" DOUBLE PRECISION NOT NULL,
    "inmateLatitude" DOUBLE PRECISION NOT NULL,
    "inmateLongitude" DOUBLE PRECISION NOT NULL,
    "victimLatitude" DOUBLE PRECISION NOT NULL,
    "victimLongitude" DOUBLE PRECISION NOT NULL,
    "externalTimestamp" TIMESTAMP(3),
    "consecutiveHits" INTEGER NOT NULL DEFAULT 2,
    "notificationSentAt" TIMESTAMP(3),
    "lastRealtimeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorType" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "victim_publicId_key" ON "victim"("publicId");

-- CreateIndex
CREATE INDEX "victim_createdById_idx" ON "victim"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "inmate_publicId_key" ON "inmate"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "inmate_externalInmateId_key" ON "inmate"("externalInmateId");

-- CreateIndex
CREATE INDEX "inmate_externalInmateId_idx" ON "inmate"("externalInmateId");

-- CreateIndex
CREATE INDEX "inmate_createdById_idx" ON "inmate"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "protection_order_publicId_key" ON "protection_order"("publicId");

-- CreateIndex
CREATE INDEX "protection_order_status_idx" ON "protection_order"("status");

-- CreateIndex
CREATE INDEX "protection_order_victimId_idx" ON "protection_order"("victimId");

-- CreateIndex
CREATE INDEX "protection_order_inmateId_idx" ON "protection_order"("inmateId");

-- CreateIndex
CREATE INDEX "protection_order_createdById_idx" ON "protection_order"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "pairing_token_tokenHash_key" ON "pairing_token"("tokenHash");

-- CreateIndex
CREATE INDEX "pairing_token_protectionOrderId_status_idx" ON "pairing_token"("protectionOrderId", "status");

-- CreateIndex
CREATE INDEX "pairing_token_expiresAt_idx" ON "pairing_token"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "device_publicId_key" ON "device"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "device_deviceTokenHash_key" ON "device"("deviceTokenHash");

-- CreateIndex
CREATE INDEX "device_protectionOrderId_status_idx" ON "device"("protectionOrderId", "status");

-- CreateIndex
CREATE INDEX "victim_location_protectionOrderId_recordedAt_idx" ON "victim_location"("protectionOrderId", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "alert_publicId_key" ON "alert"("publicId");

-- CreateIndex
CREATE INDEX "alert_protectionOrderId_status_idx" ON "alert"("protectionOrderId", "status");

-- CreateIndex
CREATE INDEX "alert_openedAt_idx" ON "alert"("openedAt");

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt");

-- CreateIndex
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");

-- CreateIndex
CREATE INDEX "audit_log_entityType_entityId_idx" ON "audit_log"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "victim" ADD CONSTRAINT "victim_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inmate" ADD CONSTRAINT "inmate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protection_order" ADD CONSTRAINT "protection_order_victimId_fkey" FOREIGN KEY ("victimId") REFERENCES "victim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protection_order" ADD CONSTRAINT "protection_order_inmateId_fkey" FOREIGN KEY ("inmateId") REFERENCES "inmate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protection_order" ADD CONSTRAINT "protection_order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pairing_token" ADD CONSTRAINT "pairing_token_protectionOrderId_fkey" FOREIGN KEY ("protectionOrderId") REFERENCES "protection_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device" ADD CONSTRAINT "device_protectionOrderId_fkey" FOREIGN KEY ("protectionOrderId") REFERENCES "protection_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "victim_location" ADD CONSTRAINT "victim_location_protectionOrderId_fkey" FOREIGN KEY ("protectionOrderId") REFERENCES "protection_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert" ADD CONSTRAINT "alert_protectionOrderId_fkey" FOREIGN KEY ("protectionOrderId") REFERENCES "protection_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
