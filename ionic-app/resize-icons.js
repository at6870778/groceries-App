const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sourceIcon = path.join(__dirname, 'resources', 'icon.png');
const outputDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

// Icon sizes for different Android densities
const sizes = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 }
];

async function resizeIcons() {
  console.log('🎨 Resizing app icons...\n');
  
  try {
    for (const { dir, size } of sizes) {
      const dirPath = path.join(outputDir, dir);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
      
      // Generate ic_launcher.png with padding for visibility
      // Adaptive icon safe zone is 66dp, but we add 20% padding to ensure full visibility
      const launcherPath = path.join(dirPath, 'ic_launcher.png');
      const paddedSize = Math.floor(size * 0.75);  // 75% of size = 25% padding
      const paddedImage = await sharp(sourceIcon)
        .resize(paddedSize, paddedSize, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .toBuffer();
      
      await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 255 }
        }
      })
        .composite([{
          input: paddedImage,
          top: Math.floor((size - paddedSize) / 2),
          left: Math.floor((size - paddedSize) / 2)
        }])
        .png()
        .toFile(launcherPath);
      console.log(`✅ ${dir}: ic_launcher.png (${size}x${size}) - padded for visibility`);
      
      // Generate ic_launcher_foreground.png (same as ic_launcher but transparent background)
      // This ensures the full logo is visible in adaptive icon
      const foregroundPath = path.join(dirPath, 'ic_launcher_foreground.png');
      await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      })
        .composite([{
          input: paddedImage,
          top: Math.floor((size - paddedSize) / 2),
          left: Math.floor((size - paddedSize) / 2)
        }])
        .png()
        .toFile(foregroundPath);
      console.log(`✅ ${dir}: ic_launcher_foreground.png (${size}x${size}) - padded, transparent`);
      
      // Generate ic_launcher_round.png (rounded icon)
      const roundPath = path.join(dirPath, 'ic_launcher_round.png');
      await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 255 }
        }
      })
        .composite([{
          input: paddedImage,
          top: Math.floor((size - paddedSize) / 2),
          left: Math.floor((size - paddedSize) / 2)
        }])
        .png()
        .toFile(roundPath);
      console.log(`✅ ${dir}: ic_launcher_round.png (${size}x${size}) - padded, rounded`);
    }
    
    console.log('\n✨ All icons generated with 25% padding for full visibility!');
  } catch (err) {
    console.error('❌ Error generating icons:', err);
    process.exit(1);
  }
}

resizeIcons();
