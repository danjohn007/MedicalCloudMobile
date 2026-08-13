const fs = require("node:fs/promises");
const path = require("node:path");
const Jimp = require("jimp-compact");

const WIDTH = 1024;
const HEIGHT = 500;

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  const sourcePath = path.join(
    projectRoot,
    "assets",
    "images",
    "Logo_DoctorCloud_Side_Color.png",
  );
  const outputDir = path.join(projectRoot, "assets", "store");
  const outputPath = path.join(
    outputDir,
    "play-feature-graphic-1024x500.png",
  );

  const logo = await Jimp.read(sourcePath);
  logo.autocrop().contain(
    820,
    300,
    Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE,
  );
  const logoWidth = logo.bitmap.width;
  const logoHeight = logo.bitmap.height;

  if (logoWidth < 1 || logoHeight < 1) {
    throw new Error("No fue posible leer las dimensiones del logotipo.");
  }

  await fs.mkdir(outputDir, { recursive: true });
  const background = await new Jimp(WIDTH, HEIGHT, 0xffffffff);
  background.composite(
    logo,
    Math.round((WIDTH - logoWidth) / 2),
    Math.round((HEIGHT - logoHeight) / 2),
  );
  background.scan(0, 0, WIDTH, HEIGHT, (_x, _y, index) => {
    background.bitmap.data[index + 3] = 255;
  });
  background.rgba(false);
  await background.writeAsync(outputPath);

  process.stdout.write(`${outputPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});
