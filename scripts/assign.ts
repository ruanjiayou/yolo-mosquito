import { readdir, stat, mkdir, symlink, rm, } from "fs/promises";
import { join, relative, dirname, basename, } from "path";
import { existsSync } from "fs";

// --- 配置区域 ---
const PROJECT_ROOT = process.cwd(); // 项目根目录
const RAW_ROOT = join(PROJECT_ROOT, "output"); // 原始数据目录
const DATASET_ROOT = join(PROJECT_ROOT, "dataset"); // 训练数据集目录

const VAL_GROUP_SIZE = 10; // 每10组取1组作为验证集
const IMG_EXTS = new Set(["jpg", "jpeg", "png"]); // 支持的图片后缀
// --- 配置结束 ---

interface DataGroup {
  imgPath: string;
  labelPath: string;
  baseName: string;
}

/**
 * 递归扫描 raw 目录，收集所有图片和对应的标注文件
 */
async function collectAllDataGroups(): Promise<DataGroup[]> {
  const groups: DataGroup[] = [];

  const dir = RAW_ROOT;

  const files = await readdir(dir + "/images", { withFileTypes: true });
  for (const file of files) {
    // 是文件且是图片,对应的标注也有
    if (file.isFile()) {
      const [name, ext] = file.name.split('.');
      const labelPath = join(dir, "labels", name + ".txt")
      if (IMG_EXTS.has(ext) && existsSync(labelPath)) {
        groups.push({
          imgPath: join(file.parentPath, file.name),
          labelPath: labelPath,
          baseName: name,
        });
      } else {
        console.warn(`⚠️ 警告: 找不到图片 ${file.name} 对应的标注文件，已跳过`);
      }
    }
  }
  return groups;
}

/**
 * 将数组随机打乱 (Fisher-Yates算法)
 */
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 清理并重建目标目录，创建软链接
 */
async function createLinksForGroups(groups: DataGroup[], split: "train" | "val") {
  const imagesTarget = join(DATASET_ROOT, "images", split);
  const labelsTarget = join(DATASET_ROOT, "labels", split);

  // 确保目标目录存在
  await mkdir(imagesTarget, { recursive: true });
  await mkdir(labelsTarget, { recursive: true });

  for (const group of groups) {
    const imgFileName = group.baseName +
      (group.imgPath.substring(group.imgPath.lastIndexOf(".")));
    const labelFileName = group.baseName + ".txt";

    const imgLinkPath = join(imagesTarget, imgFileName);
    const labelLinkPath = join(labelsTarget, labelFileName);

    // 创建软链接 (使用相对路径，使链接更便携)
    // 计算从链接到源文件的相对路径
    const imgRelativePath = relative(imagesTarget, group.imgPath);
    const labelRelativePath = relative(labelsTarget, group.labelPath);

    try {
      await symlink(imgRelativePath, imgLinkPath, "file");
      await symlink(labelRelativePath, labelLinkPath, "file");
    } catch (err: any) {
      if (err.code === "EEXIST") {
        // 如果链接已存在，先删除再创建
        await rm(imgLinkPath, { force: true });
        await rm(labelLinkPath, { force: true });
        await symlink(imgRelativePath, imgLinkPath, "file");
        await symlink(labelRelativePath, labelLinkPath, "file");
      } else {
        console.error(`创建链接失败: ${group.imgPath}`, err);
      }
    }
  }

  console.log(`✅ ${split} 集: 已创建 ${groups.length} 个链接`);
}

/**
 * 主函数
 */
async function main() {
  console.log("🚀 开始准备数据集...");

  // 1. 检查 raw 目录是否存在
  if (!existsSync(RAW_ROOT)) {
    console.error(`❌ 错误: 找不到 raw 目录: ${RAW_ROOT}`);
    process.exit(1);
  }

  // 2. 收集所有数据组
  console.log("📂 正在扫描 raw 目录...");
  const allGroups = await collectAllDataGroups();
  const total = allGroups.length;
  console.log(`📊 共找到 ${total} 组有效数据 (图片+标注)`);

  if (total < VAL_GROUP_SIZE) {
    console.error(`❌ 错误: 总组数 (${total}) 少于 ${VAL_GROUP_SIZE}，无法分配验证集，已退出。`);
    process.exit(1);
  }

  // 3. 随机打乱所有数据
  const shuffled = shuffleArray(allGroups);

  // 4. 按每10组分配验证集
  const valGroups: DataGroup[] = [];
  const trainGroups: DataGroup[] = [];

  // 按顺序处理，每10个取第1个作为验证集
  for (let i = 0; i < shuffled.length; i += VAL_GROUP_SIZE) {
    const chunk = shuffled.slice(i, i + VAL_GROUP_SIZE);
    if (chunk.length === VAL_GROUP_SIZE) {
      // 完整的一组10个，随机取1个作为验证集
      const randomIndex = Math.floor(Math.random() * chunk.length);
      const valItem = chunk.splice(randomIndex, 1)[0];
      valGroups.push(valItem);
      trainGroups.push(...chunk);
    } else {
      // 最后一组不足10个，全部放入训练集
      trainGroups.push(...chunk);
      console.log(`ℹ️ 最后一组不足${VAL_GROUP_SIZE}个 (${chunk.length}个)，全部归入训练集`);
    }
  }

  console.log(`📊 分配完成: 训练集 ${trainGroups.length} 组, 验证集 ${valGroups.length} 组`);

  // 5. 清理并重新创建 dataset 目录
  console.log("🧹 正在清理 dataset 目录...");
  await rm(DATASET_ROOT + "/images", { recursive: true, force: true });
  await rm(DATASET_ROOT + "/labels", { recursive: true, force: true });

  // 6. 创建软链接
  console.log("🔗 正在创建软链接...");
  await createLinksForGroups(trainGroups, "train");
  await createLinksForGroups(valGroups, "val");

  console.log("🎉 数据集准备完成！");
  console.log(`📁 训练集: ${trainGroups.length} 组, 验证集: ${valGroups.length} 组`);
  console.log(`💡 提示: 训练前请确认 dataset 目录中的软链接指向正确的原始文件。`);
}

// 执行主函数
main().catch((err) => {
  console.error("❌ 程序执行出错:", err);
  process.exit(1);
});