-- CreateTable
CREATE TABLE "InboundMessage" (
    "messageId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundMessage_pkey" PRIMARY KEY ("messageId")
);
