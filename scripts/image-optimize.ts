#!/usr/bin/env bun

import { existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, resolve, relative, dirname, extname } from 'path';

// ============ 配置 ============
const SUPPORTED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif'];
const JPEG_QUALITY = 85; // 1-100，数值越高画质越好，文件越大

// ============ 解析命令行参数 ============
function parseArgs() {
  const args = process.argv.slice(2);
  const result: any = { src: null, dst: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--src' && i + 1 < args.length) {
      result.src = args[++i];
    } else if (args[i] === '--dst' && i + 1 < args.length) {
      result.dst = args[++i];
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
使用方法: bun compress-images.js --src <源目录> --dst <目标目录>

参数:
  --src   源目录路径（必填）
  --dst   目标目录路径（必填）
  --help  显示帮助信息

示例:
  bun compress-images.js --src ./raw_images --dst ./compressed_images
  bun compress-images.js --src /path/to/source --dst /path/to/dest
  `);
      process.exit(0);
    }
  }

  if (!result.src || !result.dst) {
    console.error('❌ 错误: --src 和 --dst 都是必填参数');
    console.log('使用 --help 查看帮助');
    process.exit(1);
  }

  return result;
}

// ============ 获取参数 ============
const { src: srcArg, dst: dstArg } = parseArgs();
const srcDir = resolve(srcArg);
const dstDir = resolve(dstArg);

if (!existsSync(srcDir)) {
  console.error(`❌ 源目录不存在: ${srcDir}`);
  process.exit(1);
}

console.log(`📂 源目录: ${srcDir}`);
console.log(`📂 目标目录: ${dstDir}`);
console.log(`🖼️  图片质量: ${JPEG_QUALITY}%\n`);

// ============ 核心压缩函数 ============
async function compressImage(inputPath: string, outputPath: string, quality = JPEG_QUALITY) {
  // 1. 确保输出目录存在
  const outDir = dirname(outputPath);
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  // 2. 读取原始文件大小
  const inputFile = Bun.file(inputPath);
  if (!await inputFile.exists()) {
    throw new Error(`输入文件不存在: ${inputPath}`);
  }
  const originalSize = inputFile.size;

  // 3. 使用 Bun.Image 压缩并写入 JPG
  //    Bun.Image 默认会移除元数据，只保留图像数据
  await Bun.file(inputPath)
    .image()
    .jpeg({ quality })
    .write(outputPath);

  // 4. 读取压缩后的实际文件大小
  const outputFile = Bun.file(outputPath);
  const stats = await outputFile.stat();
  const compressedSize = stats.size;

  return { originalSize, compressedSize };
}

// ============ 递归遍历目录 ============
function getImageFiles(dir: string, baseDir = dir) {
  const results = [];
  const items = readdirSync(dir);

  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // results.push(...getImageFiles(fullPath, baseDir));
    } else {
      const ext = extname(item).toLowerCase();
      if (SUPPORTED_EXTS.includes(ext)) {
        const relativePath = relative(baseDir, fullPath);
        results.push({
          inputPath: fullPath,
          relativePath,
          ext
        });
      }
    }
  }

  return results;
}

// ============ 格式化文件大小 ============
function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)}GB`;
}

// ============ 主函数 ============
async function main() {
  console.log('🔍 正在扫描图片...\n');

  const images = getImageFiles(srcDir);
  console.log(`📊 共找到 ${images.length} 张图片\n`);

  if (images.length === 0) {
    console.log('⚠️  没有找到支持的图片文件');
    console.log(`支持的格式: ${SUPPORTED_EXTS.join(', ')}`);
    return;
  }

  let totalOriginalSize = 0;
  let totalCompressedSize = 0;
  let successCount = 0;
  let failCount = 0;
  const failedFiles = [];

  for (let i = 0; i < images.length; i++) {
    const { inputPath, relativePath } = images[i];
    const outputPath = join(dstDir, relativePath.replace(/\.[^.]+$/, '.jpg'));

    try {
      process.stdout.write(`[${String(i + 1).padStart(String(images.length).length)}/${images.length}] 处理: ${relativePath} ... `);

      const { originalSize, compressedSize } = await compressImage(inputPath, outputPath, JPEG_QUALITY);

      totalOriginalSize += originalSize;
      totalCompressedSize += compressedSize;
      successCount++;

      const savedPercent = ((originalSize - compressedSize) / originalSize * 100);
      const saved = originalSize - compressedSize;

      console.log(`✅ ${formatSize(originalSize)} → ${formatSize(compressedSize)} (${savedPercent.toFixed(1)}% 缩减 ${formatSize(originalSize - compressedSize)})`);
    } catch (err: any) {
      console.log(`❌ 失败: ${err.message}`);
      failCount++;
      failedFiles.push({ path: relativePath, error: err.message });
    }
  }

  // ============ 输出汇总 ============
  console.log('\n' + '='.repeat(70));
  console.log('📊 压缩汇总报告');
  console.log('='.repeat(70));
  console.log(`✅ 成功: ${successCount} 张`);
  console.log(`❌ 失败: ${failCount} 张`);
  if (failedFiles.length > 0) {
    console.log('\n失败文件列表:');
    failedFiles.forEach(f => console.log(`  - ${f.path}: ${f.error}`));
  }
  console.log(`\n📁 源目录总大小: ${formatSize(totalOriginalSize)}`);
  console.log(`📦 压缩后总大小: ${formatSize(totalCompressedSize)}`);
  const overallRatio = totalOriginalSize > 0 ? (totalCompressedSize / totalOriginalSize * 100) : 0;
  console.log(`🎯 总压缩比: ${overallRatio.toFixed(2)}%`);
  console.log(`💾 总共节省: ${formatSize(totalOriginalSize - totalCompressedSize)}`);

}

// ============ 执行 ============
main().catch(err => {
  console.error('❌ 程序执行失败:', err);
  process.exit(1);
});