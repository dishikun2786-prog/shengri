import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
}

function createFileFilter() {
    return (_req: any, file: any, cb: Function) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = extname(file.originalname).toLowerCase().slice(1);
    const mime = file.mimetype.toLowerCase();
    if (allowed.test(ext) && allowed.test(mime)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('只支持 jpeg/jpg/png/gif/webp 格式图片'), false);
    }
  };
}

function createStorage(subDir: string) {
  const baseDir = join(process.cwd(), 'public', 'uploads');
  return diskStorage({
    destination: (_req, _file, cb) => {
      const userDir = join(baseDir, subDir);
      if (!existsSync(userDir)) mkdirSync(userDir, { recursive: true });
      cb(null, userDir);
    },
    filename: (_req, _file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}${extname(_file.originalname)}`);
    },
  });
}

@ApiTags('文件上传')
@Controller('upload')
export class UploadController {
  @Post('image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', {
    storage: createStorage('moments'),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: createFileFilter(),
  }))
  @ApiOperation({ summary: '上传单张图片' })
  uploadImage(@UploadedFile() file: UploadedFile | undefined) {
    if (!file) {
      throw new BadRequestException('请选择要上传的图片');
    }
    const url = `/uploads/moments/${file.filename}`;
    return { url, filename: file.filename, size: file.size };
  }

  @Post('images')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('files', 9, {
    storage: createStorage('moments'),
    limits: { fileSize: 5 * 1024 * 1024, files: 9 },
    fileFilter: createFileFilter(),
  }))
  @ApiOperation({ summary: '批量上传图片（最多9张）' })
  uploadImages(@UploadedFiles() files: UploadedFile[] | undefined) {
    if (!files || files.length === 0) {
      throw new BadRequestException('请选择要上传的图片');
    }
    const urls = files.map((f) => ({ url: `/uploads/moments/${f.filename}`, filename: f.filename, size: f.size }));
    return { urls };
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', {
    storage: createStorage('avatars'),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: createFileFilter(),
  }))
  @ApiOperation({ summary: '上传头像' })
  uploadAvatar(@UploadedFile() file: UploadedFile | undefined) {
    if (!file) {
      throw new BadRequestException('请选择要上传的头像');
    }
    const url = `/uploads/avatars/${file.filename}`;
    return { url, filename: file.filename, size: file.size };
  }
}
