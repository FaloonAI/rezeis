-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DEV', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('EN', 'RU');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'RUB', 'USDT', 'XTR', 'TON', 'BTC', 'ETH');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'DISABLED', 'LIMITED', 'EXPIRED', 'DELETED');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('ANDROID', 'IPHONE', 'WINDOWS', 'MAC', 'LINUX', 'OTHER');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('TRAFFIC', 'DEVICES', 'BOTH', 'UNLIMITED');

-- CreateEnum
CREATE TYPE "PlanAvailability" AS ENUM ('ALL', 'NEW', 'EXISTING', 'INVITED', 'ALLOWED', 'TRIAL');

-- CreateEnum
CREATE TYPE "ArchivedPlanRenewMode" AS ENUM ('SELF_RENEW', 'REPLACE_ON_RENEW');

-- CreateEnum
CREATE TYPE "TrafficLimitStrategy" AS ENUM ('NO_RESET', 'DAY', 'WEEK', 'MONTH');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELED', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "PurchaseType" AS ENUM ('NEW', 'RENEW', 'UPGRADE', 'ADDITIONAL');

-- CreateEnum
CREATE TYPE "PurchaseChannel" AS ENUM ('WEB', 'TELEGRAM', 'MINI_APP');

-- CreateEnum
CREATE TYPE "PaymentGatewayType" AS ENUM ('YOOKASSA', 'TELEGRAM_STARS', 'PLATEGA', 'HELEKET', 'CRYPTOMUS', 'MULENPAY');

-- CreateEnum
CREATE TYPE "PaymentWebhookLifecycleStatus" AS ENUM ('RECEIVED', 'ENQUEUED', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "PromoCodeRewardType" AS ENUM ('DURATION', 'TRAFFIC', 'DEVICES', 'SUBSCRIPTION', 'PERSONAL_DISCOUNT', 'PURCHASE_DISCOUNT');

-- CreateEnum
CREATE TYPE "PromoCodeAvailability" AS ENUM ('ALL', 'NEW', 'EXISTING', 'INVITED', 'ALLOWED');

-- CreateEnum
CREATE TYPE "ReferralLevel" AS ENUM ('FIRST', 'SECOND', 'THIRD');

-- CreateEnum
CREATE TYPE "PartnerLevel" AS ENUM ('LEVEL_1', 'LEVEL_2', 'LEVEL_3');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "SyncAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AccessMode" AS ENUM ('PUBLIC', 'INVITED', 'PURCHASE_BLOCKED', 'REG_BLOCKED', 'RESTRICTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT,
    "username" TEXT,
    "name" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "referralCode" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "language" "Locale" NOT NULL DEFAULT 'EN',
    "personalDiscount" INTEGER NOT NULL DEFAULT 0,
    "purchaseDiscount" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "maxSubscriptions" INTEGER NOT NULL DEFAULT 1,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "isBotBlocked" BOOLEAN NOT NULL DEFAULT false,
    "isRulesAccepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "loginNormalized" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "passwordChangedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "remnawaveId" TEXT,
    "remnawaveData" JSONB,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'DISABLED',
    "isTrial" BOOLEAN NOT NULL DEFAULT false,
    "planSnapshot" JSONB NOT NULL,
    "trafficLimit" INTEGER,
    "deviceLimit" INTEGER NOT NULL DEFAULT 1,
    "internalSquads" TEXT[],
    "externalSquad" TEXT,
    "configUrl" TEXT,
    "deviceType" "DeviceType",
    "startedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,

    CONSTRAINT "TrialGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tag" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedRenewMode" "ArchivedPlanRenewMode" NOT NULL DEFAULT 'SELF_RENEW',
    "type" "PlanType" NOT NULL DEFAULT 'TRAFFIC',
    "availability" "PlanAvailability" NOT NULL DEFAULT 'ALL',
    "trafficLimit" INTEGER,
    "deviceLimit" INTEGER NOT NULL DEFAULT 1,
    "trafficLimitStrategy" "TrafficLimitStrategy" NOT NULL DEFAULT 'NO_RESET',
    "internalSquads" TEXT[],
    "externalSquad" TEXT,
    "upgradeToPlanIds" TEXT[],
    "replacementPlanIds" TEXT[],
    "allowedUserIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanDuration" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "days" INTEGER NOT NULL,

    CONSTRAINT "PlanDuration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanPrice" (
    "id" TEXT NOT NULL,
    "planDurationId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "PlanPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "purchaseType" "PurchaseType" NOT NULL DEFAULT 'NEW',
    "channel" "PurchaseChannel" NOT NULL DEFAULT 'WEB',
    "gatewayType" "PaymentGatewayType" NOT NULL,
    "currency" "Currency" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentAsset" TEXT,
    "planSnapshot" JSONB,
    "gatewayId" TEXT,
    "gatewayData" JSONB,
    "deviceTypes" "DeviceType"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "availability" "PromoCodeAvailability" NOT NULL DEFAULT 'ALL',
    "rewardType" "PromoCodeRewardType" NOT NULL,
    "rewardValue" INTEGER NOT NULL,
    "planSnapshot" JSONB,
    "lifetime" INTEGER,
    "maxActivations" INTEGER,
    "remainingUses" INTEGER,
    "allowedUserIds" TEXT[],
    "allowedPlanIds" TEXT[],
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCodeActivation" (
    "id" TEXT NOT NULL,
    "promoCodeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardType" "PromoCodeRewardType" NOT NULL,
    "rewardValue" INTEGER NOT NULL,
    "targetSubscriptionId" TEXT,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoCodeActivation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "level" "ReferralLevel" NOT NULL,
    "qualifiedAt" TIMESTAMP(3),
    "qualifiedPurchaseChannel" "PurchaseChannel",
    "qualifiedTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralInvite" (
    "id" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralReward" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "isIssued" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" INTEGER NOT NULL DEFAULT 0,
    "totalWithdrawn" INTEGER NOT NULL DEFAULT 0,
    "referralsCount" INTEGER NOT NULL DEFAULT 0,
    "level2ReferralsCount" INTEGER NOT NULL DEFAULT 0,
    "level3ReferralsCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "individualSettings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerTransaction" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "referralTelegramId" BIGINT NOT NULL,
    "level" "PartnerLevel" NOT NULL,
    "paymentAmount" INTEGER NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "earnedAmount" INTEGER NOT NULL,
    "sourceTransactionId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerWithdrawal" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "requestedAmount" DECIMAL(24,8) NOT NULL,
    "requestedCurrency" "Currency" NOT NULL,
    "quoteRate" DECIMAL(24,8) NOT NULL,
    "quoteSource" TEXT,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT,
    "requisites" TEXT,
    "adminComment" TEXT,
    "processedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerWithdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerReferral" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "referralTelegramId" BIGINT NOT NULL,
    "level" "PartnerLevel" NOT NULL,
    "parentPartnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentGateway" (
    "id" TEXT NOT NULL,
    "type" "PaymentGatewayType" NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentGateway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "gatewayType" "PaymentGatewayType" NOT NULL,
    "paymentId" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventStatus" TEXT,
    "status" "PaymentWebhookLifecycleStatus" NOT NULL DEFAULT 'RECEIVED',
    "payloadHash" TEXT,
    "rawPayload" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "reconciliationAttempts" INTEGER NOT NULL DEFAULT 0,
    "replayCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "lastTransitionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReplayedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "rulesRequired" BOOLEAN NOT NULL DEFAULT true,
    "rulesLink" TEXT,
    "channelRequired" BOOLEAN NOT NULL DEFAULT false,
    "channelId" BIGINT,
    "channelLink" TEXT,
    "accessMode" "AccessMode" NOT NULL DEFAULT 'PUBLIC',
    "inviteModeStartedAt" TIMESTAMP(3),
    "defaultCurrency" "Currency" NOT NULL DEFAULT 'USD',
    "userNotifications" JSONB NOT NULL DEFAULT '{}',
    "systemNotifications" JSONB NOT NULL DEFAULT '{}',
    "referralSettings" JSONB NOT NULL DEFAULT '{}',
    "partnerSettings" JSONB NOT NULL DEFAULT '{}',
    "multiSubscriptionSettings" JSONB NOT NULL DEFAULT '{}',
    "branding" JSONB NOT NULL DEFAULT '{}',
    "botMenu" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileSyncJob" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "action" "SyncAction" NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "response" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "ProfileSyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemnawaveProfileCache" (
    "id" TEXT NOT NULL,
    "remnawaveId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "profileData" JSONB NOT NULL,
    "configUrl" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RemnawaveProfileCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BroadcastMessage" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "userTelegramId" BIGINT NOT NULL,
    "messageId" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BroadcastMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotificationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "i18nKey" TEXT,
    "i18nKwargs" JSONB,
    "renderedText" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "readSource" TEXT,
    "botChatId" BIGINT,
    "botMessageId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserNotificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventName" TEXT NOT NULL,
    "sourcePath" TEXT,
    "sessionId" TEXT,
    "userTelegramId" BIGINT,
    "deviceMode" TEXT,
    "isInTelegram" BOOLEAN NOT NULL DEFAULT false,
    "hasInitData" BOOLEAN NOT NULL DEFAULT false,
    "startParam" TEXT,
    "chatType" TEXT,
    "meta" JSONB,

    CONSTRAINT "WebAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackupRecord" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "backupTimestamp" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "backupScope" TEXT NOT NULL,
    "includesDatabase" BOOLEAN NOT NULL DEFAULT true,
    "includesAssets" BOOLEAN NOT NULL DEFAULT false,
    "fileSizeBytes" BIGINT,
    "compressed" BOOLEAN NOT NULL DEFAULT true,
    "tablesCount" INTEGER,
    "totalRecords" INTEGER,
    "version" TEXT,
    "localPath" TEXT,
    "telegramChatId" BIGINT,
    "telegramMessageId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackupRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "login" TEXT,
    "loginNormalized" TEXT,
    "email" TEXT,
    "emailNormalized" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "passwordHash" TEXT,
    "requiresPasswordChange" BOOLEAN NOT NULL DEFAULT false,
    "temporaryPasswordExpiresAt" TIMESTAMP(3),
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "linkPromptSnoozeUntil" TIMESTAMP(3),
    "credentialsBootstrappedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthChallenge" (
    "id" TEXT NOT NULL,
    "webAccountId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "codeHash" TEXT,
    "tokenHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attemptsLeft" INTEGER NOT NULL DEFAULT 5,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "User_telegramId_idx" ON "User"("telegramId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_loginNormalized_key" ON "AdminUser"("loginNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminUserId_idx" ON "AdminAuditLog"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_remnawaveId_idx" ON "Subscription"("remnawaveId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TrialGrant_userId_key" ON "TrialGrant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TrialGrant_subscriptionId_key" ON "TrialGrant"("subscriptionId");

-- CreateIndex
CREATE INDEX "TrialGrant_grantedAt_idx" ON "TrialGrant"("grantedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");

-- CreateIndex
CREATE INDEX "Plan_isActive_idx" ON "Plan"("isActive");

-- CreateIndex
CREATE INDEX "Plan_availability_idx" ON "Plan"("availability");

-- CreateIndex
CREATE UNIQUE INDEX "PlanDuration_planId_days_key" ON "PlanDuration"("planId", "days");

-- CreateIndex
CREATE UNIQUE INDEX "PlanPrice_planDurationId_currency_key" ON "PlanPrice"("planDurationId", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_paymentId_key" ON "Transaction"("paymentId");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_gatewayType_idx" ON "Transaction"("gatewayType");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

-- CreateIndex
CREATE INDEX "PromoCode_isActive_idx" ON "PromoCode"("isActive");

-- CreateIndex
CREATE INDEX "PromoCodeActivation_userId_idx" ON "PromoCodeActivation"("userId");

-- CreateIndex
CREATE INDEX "PromoCodeActivation_promoCodeId_idx" ON "PromoCodeActivation"("promoCodeId");

-- CreateIndex
CREATE INDEX "Referral_referrerId_idx" ON "Referral"("referrerId");

-- CreateIndex
CREATE INDEX "Referral_referredId_idx" ON "Referral"("referredId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referrerId_referredId_key" ON "Referral"("referrerId", "referredId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralInvite_token_key" ON "ReferralInvite"("token");

-- CreateIndex
CREATE INDEX "ReferralInvite_inviterId_idx" ON "ReferralInvite"("inviterId");

-- CreateIndex
CREATE INDEX "ReferralReward_userId_idx" ON "ReferralReward"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_userId_key" ON "Partner"("userId");

-- CreateIndex
CREATE INDEX "PartnerTransaction_partnerId_idx" ON "PartnerTransaction"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerWithdrawal_partnerId_idx" ON "PartnerWithdrawal"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerWithdrawal_status_idx" ON "PartnerWithdrawal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerReferral_partnerId_referralTelegramId_key" ON "PartnerReferral"("partnerId", "referralTelegramId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGateway_type_key" ON "PaymentGateway"("type");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_gatewayType_idx" ON "PaymentWebhookEvent"("gatewayType");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_paymentId_idx" ON "PaymentWebhookEvent"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_status_receivedAt_idx" ON "PaymentWebhookEvent"("status", "receivedAt");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_status_lastTransitionAt_idx" ON "PaymentWebhookEvent"("status", "lastTransitionAt");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_gatewayType_status_receivedAt_idx" ON "PaymentWebhookEvent"("gatewayType", "status", "receivedAt");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_paymentId_status_idx" ON "PaymentWebhookEvent"("paymentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_gatewayType_providerEventId_key" ON "PaymentWebhookEvent"("gatewayType", "providerEventId");

-- CreateIndex
CREATE INDEX "ProfileSyncJob_status_idx" ON "ProfileSyncJob"("status");

-- CreateIndex
CREATE INDEX "ProfileSyncJob_subscriptionId_idx" ON "ProfileSyncJob"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "RemnawaveProfileCache_remnawaveId_key" ON "RemnawaveProfileCache"("remnawaveId");

-- CreateIndex
CREATE UNIQUE INDEX "RemnawaveProfileCache_subscriptionId_key" ON "RemnawaveProfileCache"("subscriptionId");

-- CreateIndex
CREATE INDEX "RemnawaveProfileCache_subscriptionId_idx" ON "RemnawaveProfileCache"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Broadcast_taskId_key" ON "Broadcast"("taskId");

-- CreateIndex
CREATE INDEX "BroadcastMessage_broadcastId_idx" ON "BroadcastMessage"("broadcastId");

-- CreateIndex
CREATE INDEX "UserNotificationEvent_userId_idx" ON "UserNotificationEvent"("userId");

-- CreateIndex
CREATE INDEX "UserNotificationEvent_isRead_idx" ON "UserNotificationEvent"("isRead");

-- CreateIndex
CREATE INDEX "WebAnalyticsEvent_eventName_idx" ON "WebAnalyticsEvent"("eventName");

-- CreateIndex
CREATE INDEX "WebAnalyticsEvent_userTelegramId_idx" ON "WebAnalyticsEvent"("userTelegramId");

-- CreateIndex
CREATE UNIQUE INDEX "WebAccount_userId_key" ON "WebAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WebAccount_loginNormalized_key" ON "WebAccount"("loginNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "WebAccount_email_key" ON "WebAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WebAccount_emailNormalized_key" ON "WebAccount"("emailNormalized");

-- CreateIndex
CREATE INDEX "AuthChallenge_webAccountId_idx" ON "AuthChallenge"("webAccountId");

-- CreateIndex
CREATE INDEX "AuthChallenge_purpose_idx" ON "AuthChallenge"("purpose");

-- CreateIndex
CREATE INDEX "AuthChallenge_destination_idx" ON "AuthChallenge"("destination");

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialGrant" ADD CONSTRAINT "TrialGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialGrant" ADD CONSTRAINT "TrialGrant_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanDuration" ADD CONSTRAINT "PlanDuration_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPrice" ADD CONSTRAINT "PlanPrice_planDurationId_fkey" FOREIGN KEY ("planDurationId") REFERENCES "PlanDuration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCodeActivation" ADD CONSTRAINT "PromoCodeActivation_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCodeActivation" ADD CONSTRAINT "PromoCodeActivation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCodeActivation" ADD CONSTRAINT "PromoCodeActivation_targetSubscriptionId_fkey" FOREIGN KEY ("targetSubscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralInvite" ADD CONSTRAINT "ReferralInvite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerTransaction" ADD CONSTRAINT "PartnerTransaction_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerWithdrawal" ADD CONSTRAINT "PartnerWithdrawal_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerReferral" ADD CONSTRAINT "PartnerReferral_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BroadcastMessage" ADD CONSTRAINT "BroadcastMessage_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotificationEvent" ADD CONSTRAINT "UserNotificationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebAnalyticsEvent" ADD CONSTRAINT "WebAnalyticsEvent_userTelegramId_fkey" FOREIGN KEY ("userTelegramId") REFERENCES "User"("telegramId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebAccount" ADD CONSTRAINT "WebAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthChallenge" ADD CONSTRAINT "AuthChallenge_webAccountId_fkey" FOREIGN KEY ("webAccountId") REFERENCES "WebAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
