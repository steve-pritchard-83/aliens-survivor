import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const modelsDir = 'public/models';
const files = fs.readdirSync(modelsDir).filter((f) => f.endsWith('.glb') && !f.includes('.opt.'));

console.log(`Found ${files.length} GLB models to optimize...`);

let totalBefore = 0;
let totalAfter = 0;

for (const file of files) {
  const fullPath = path.join(modelsDir, file);
  const tempPath = path.join(modelsDir, `${file}.tmp.glb`);
  const sizeBefore = fs.statSync(fullPath).size;
  totalBefore += sizeBefore;

  console.log(`\nOptimizing ${file} (${(sizeBefore / (1024 * 1024)).toFixed(2)} MB)...`);
  try {
    execSync(
      `npx @gltf-transform/cli optimize "${fullPath}" "${tempPath}" --compress meshopt --texture-compress webp`,
      {
        stdio: 'inherit'
      }
    );
    if (fs.existsSync(tempPath)) {
      const sizeAfter = fs.statSync(tempPath).size;
      totalAfter += sizeAfter;
      fs.copyFileSync(tempPath, fullPath);
      fs.unlinkSync(tempPath);
      console.log(
        `✓ ${file}: ${(sizeBefore / 1024).toFixed(1)} KB → ${(sizeAfter / 1024).toFixed(1)} KB (-${((1 - sizeAfter / sizeBefore) * 100).toFixed(1)}%)`
      );
    }
  } catch (err) {
    console.error(`Failed optimizing ${file}:`, err.message);
  }
}

console.log(`\n========================================`);
console.log(
  `Total payload: ${(totalBefore / (1024 * 1024)).toFixed(2)} MB → ${(totalAfter / (1024 * 1024)).toFixed(2)} MB`
);
console.log(`Savings: ${((1 - totalAfter / totalBefore) * 100).toFixed(1)}% reduction!`);
