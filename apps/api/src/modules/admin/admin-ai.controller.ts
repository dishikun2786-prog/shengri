import {
  Controller, Get, Post, Put, Delete,
  Body, Param, ParseIntPipe, UseGuards, HttpException, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AiService } from '../ai/ai.service';
import { CryptoService } from '../../common/crypto/crypto.service';

@Controller('admin/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminAiController {
  constructor(
    private aiService: AiService,
    private crypto: CryptoService,
  ) {}

  @Get('config')
  async getAiConfig() {
    const providers = await this.aiService.getAllProviders();
    const defaultProvider = await this.aiService.getDefaultProvider();
    return {
      defaultProvider,
      providers: providers.map((p) => ({
        id: p.id,
        provider: p.provider,
        name: p.name,
        baseURL: p.baseURL,
        defaultModel: p.defaultModel,
        availableModels: p.availableModels || [],
        config: p.config || {},
        isDefault: p.isDefault,
        isActive: p.isActive,
        priority: p.priority,
        hasKey: !!p.apiKey && p.apiKey.length > 3,
        keyPreview: p.apiKey
          ? p.apiKey.slice(0, 4) + '****' + p.apiKey.slice(-4)
          : '',
      })),
    };
  }

  @Get('providers')
  async listProviders() {
    const providers = await this.aiService.getAllProviders();
    return providers.map((p) => ({
      id: p.id,
      provider: p.provider,
      name: p.name,
      baseURL: p.baseURL,
      defaultModel: p.defaultModel,
      availableModels: p.availableModels || [],
      config: p.config || {},
      isDefault: p.isDefault,
      isActive: p.isActive,
      priority: p.priority,
      hasKey: !!p.apiKey && p.apiKey.length > 3,
      keyPreview: p.apiKey
        ? p.apiKey.slice(0, 4) + '****' + p.apiKey.slice(-4)
        : '',
    }));
  }

  @Post('providers')
  async createProvider(@Body() body: {
    provider: string;
    name: string;
    apiKey: string;
    baseURL: string;
    defaultModel: string;
    config?: Record<string, any>;
    isDefault?: boolean;
    priority?: number;
  }) {
    if (!body.provider || !body.name || !body.baseURL || !body.defaultModel) {
      throw new HttpException('缺少必填字段', HttpStatus.BAD_REQUEST);
    }
    return this.aiService.createProviderConfig(body);
  }

  @Put('providers/:id')
  async updateProvider(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      name?: string;
      apiKey?: string;
      baseURL?: string;
      defaultModel?: string;
      config?: Record<string, any>;
      isDefault?: boolean;
      isActive?: boolean;
      priority?: number;
    },
  ) {
    return this.aiService.updateProviderConfig(id, body);
  }

  @Delete('providers/:id')
  async deleteProvider(@Param('id', ParseIntPipe) id: number) {
    await this.aiService.deleteProviderConfig(id);
    return { success: true };
  }

  @Post('providers/:id/set-default')
  async setDefaultProvider(@Param('id', ParseIntPipe) id: number) {
    return this.aiService.setDefaultProvider(id);
  }

  @Post('providers/:id/test')
  async testProvider(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { prompt?: string },
  ) {
    const providers = await this.aiService.getAllProviders();
    const target = providers.find((p) => p.id === id);
    if (!target) {
      throw new HttpException('提供商不存在', HttpStatus.NOT_FOUND);
    }
    return this.aiService.testProvider(target.provider, body.prompt);
  }

  @Post('test')
  async testProviderByName(
    @Body() body: { provider: string; prompt?: string },
  ) {
    return this.aiService.testProvider(body.provider, body.prompt);
  }

  @Get('providers/:id/models')
  async fetchModels(@Param('id', ParseIntPipe) id: number) {
    const providers = await this.aiService.getAllProviders();
    const target = providers.find((p) => p.id === id);
    if (!target) {
      throw new HttpException('提供商不存在', HttpStatus.NOT_FOUND);
    }
    try {
      const models = await this.aiService.fetchRemoteModels(target.provider);
      return { provider: target.provider, models };
    } catch (error) {
      throw new HttpException(
        `获取模型列表失败: ${error.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Post('providers/migrate-env')
  async migrateFromEnv() {
    const migrated = await this.aiService.migrateFromEnv();
    return {
      message: `成功迁移 ${migrated.length} 个提供商配置`,
      providers: migrated,
    };
  }
}
