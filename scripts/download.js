import fs from 'fs';
import path from 'path';

/**
 * 下载蚊子图片数据
 */
const file = Bun.file("./scripts/data/File_List.json");
const list = await file.json();

let total = 0;
const t2021 = new Date('2021-01-01 00:00:00.000000+00:00').getTime();

const dir = process.cwd() + "/download/"
const images = [];
const download_limit = 100
const types = new Set();

fs.mkdirSync(dir);

// 选择其中的高质量数据
list.forEach(v => {
  let time = new Date(v.attributes[3].value);
  const type = v.attributes[0].value
  types.add(type)
  if (["aedes_albopictus", "culex_sp.", "aedes_aegypti", "aedes_japonicus", "aedes_koreicus", "japonicus_koreicus"].includes(type)
    && v.attributes[2].name === 'confidence'
    && v.attributes[2].value === 'confirmed'
    && time.getTime() > t2021
  ) {
    if (images.length < download_limit) {
      images.push("https://ftp.ebi.ac.uk/biostudies/fire/S-BIAD/249/S-BIAD249/Files/" + v.path)
    }
    total++;
  }
});

console.log(total);
console.log(Array.from(types))
// process.exit();

async function downloadLargeFile(url, filePath) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`下载失败: ${response.status}`);
  }

  // 如果响应体是 ReadableStream (Bun 的 fetch 默认支持)
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("无法获取响应流");
  }

  // 创建一个文件写入流
  const fileWriter = Bun.file(filePath).writer();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // 将数据块写入文件
    fileWriter.write(value);
  }

  await fileWriter.end();
}

for (let i = 0; i < images.length; i++) {
  const url = images[i];
  console.log(`download ${i + 1}: ${url}`)
  await downloadLargeFile(url, dir + path.basename(url).toLocaleLowerCase());
}
console.log('finished');