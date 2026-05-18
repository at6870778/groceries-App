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
      
      // Resize and save icon
      const outputPath = path.join(dirPath, 'ic_launcher.png');
      await sharp(sourceIcon)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ ${dir}: ${size}x${size} → ${outputPath}`);
    }
    
    console.log('\n✨ All icons generated successfully!');
  } catch (err) {
    console.error('❌ Error generating icons:', err);
    process.exit(1);
  }
}

resizeIcons();
