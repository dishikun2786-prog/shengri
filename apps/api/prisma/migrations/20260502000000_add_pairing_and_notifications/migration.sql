-- CreateTable: pairing_requests
CREATE TABLE "pairing_requests" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "initiator_id" INTEGER NOT NULL,
    "receiver_id" INTEGER NOT NULL,
    "pairing_type" TEXT NOT NULL,
    "initiator_chart_id" INTEGER,
    "receiver_chart_id" INTEGER,
    "status" INTEGER NOT NULL DEFAULT 0,
    "report_id" INTEGER,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pairing_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notifications
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pairing_requests_uuid_key" ON "pairing_requests"("uuid");
CREATE UNIQUE INDEX "notifications_uuid_key" ON "notifications"("uuid");

CREATE INDEX "pairing_requests_initiator_id_status_idx" ON "pairing_requests"("initiator_id", "status");
CREATE INDEX "pairing_requests_receiver_id_status_idx" ON "pairing_requests"("receiver_id", "status");
CREATE INDEX "pairing_requests_status_created_at_idx" ON "pairing_requests"("status", "created_at");

CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- Foreign Keys
ALTER TABLE "pairing_requests" ADD CONSTRAINT "pairing_requests_initiator_id_fkey" FOREIGN KEY ("initiator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pairing_requests" ADD CONSTRAINT "pairing_requests_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pairing_requests" ADD CONSTRAINT "pairing_requests_initiator_chart_id_fkey" FOREIGN KEY ("initiator_chart_id") REFERENCES "bazi_charts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pairing_requests" ADD CONSTRAINT "pairing_requests_receiver_chart_id_fkey" FOREIGN KEY ("receiver_chart_id") REFERENCES "bazi_charts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_ref_id_fkey" FOREIGN KEY ("ref_id") REFERENCES "pairing_requests"("uuid") ON DELETE SET NULL ON UPDATE CASCADE;
