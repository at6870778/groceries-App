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
      
      // Generate ic_launcher.png
      const launcherPath = path.join(dirPath, 'ic_launcher.png');
      await sharp(sourceIcon)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(launcherPath);
      console.log(`✅ ${dir}: ic_launcher.png (${size}x${size})`);
      
      // Generate ic_launcher_foreground.png (used by adaptive icon on Android 8.0+)
      // Use transparent background so Android's adaptive icon mask doesn't crop the logo
      const foregroundPath = path.join(dirPath, 'ic_launcher_foreground.png');
      await sharp(sourceIcon)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }  // Transparent background
        })
        .png()
        .toFile(foregroundPath);
      console.log(`✅ ${dir}: ic_launcher_foreground.png (${size}x${size}) - transparent`);
      
      // Generate ic_launcher_round.png (used for round icon display)
      // Use transparent background to match adaptive icon behavior
      const roundPath = path.join(dirPath, 'ic_launcher_round.png');
      await sharp(sourceIcon)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }  // Transparent background
        })
        .png()
        .toFile(roundPath);
      console.log(`✅ ${dir}: ic_launcher_round.png (${size}x${size}) - transparent`);
    }
    
    console.log('\n✨ All icons (ic_launcher, ic_launcher_foreground, ic_launcher_round) generated successfully!');
  } catch (err) {
    console.error('❌ Error generating icons:', err);
    process.exit(1);
  }
}

resizeIcons();
