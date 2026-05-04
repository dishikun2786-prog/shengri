-- CreateTable
CREATE TABLE "ai_model_configs" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "default_model" TEXT NOT NULL,
    "available_models" JSONB,
    "config" JSONB,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "last_test_at" TIMESTAMP(3),
    "last_test_result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_model_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_model_configs_provider_key" ON "ai_model_configs"("provider");
