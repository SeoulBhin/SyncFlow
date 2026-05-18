-- CreateTable: saved_messages
-- Migration: 20260518010000_add_saved_messages

CREATE TABLE "saved_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "saved_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saved_messages_user_id_message_id_key"
ON "saved_messages"("user_id", "message_id");

CREATE INDEX "saved_messages_user_id_idx"
ON "saved_messages"("user_id");

CREATE INDEX "saved_messages_message_id_idx"
ON "saved_messages"("message_id");

ALTER TABLE "saved_messages"
ADD CONSTRAINT "saved_messages_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "saved_messages"
ADD CONSTRAINT "saved_messages_message_id_fkey"
FOREIGN KEY ("message_id") REFERENCES "messages"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
