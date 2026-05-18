-- CreateTable
CREATE TABLE "meeting_guest_invites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token" VARCHAR(64) NOT NULL,
    "meeting_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "max_uses" INTEGER,
    "use_count" INTEGER NOT NULL DEFAULT 0,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_guest_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (token unique)
CREATE UNIQUE INDEX "meeting_guest_invites_token_key" ON "meeting_guest_invites"("token");

-- CreateIndex (meeting_id)
CREATE INDEX "meeting_guest_invites_meeting_id_idx" ON "meeting_guest_invites"("meeting_id");

-- AddForeignKey
ALTER TABLE "meeting_guest_invites" ADD CONSTRAINT "meeting_guest_invites_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
