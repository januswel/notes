import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { globSync } from "glob";
import { basename, join, resolve } from "path";
import satori from "satori";

const WIDTH = 1200;
const HEIGHT = 630;
const SITE_NAME = "januswel's notes";

const baseDir = resolve(import.meta.dirname, "../../..");
const contentDir = join(baseDir, "content");
const outputDir = join(baseDir, "static/og");
const fontPath = join(import.meta.dirname, "../fonts/NotoSansJP-Bold.ttf");

const fontData = readFileSync(fontPath);

function extractTitle(content: string): string | null {
  const match = content.match(/^\+\+\+\s*\n([\s\S]*?)\n\+\+\+/);
  if (!match) return null;

  const titleMatch = match[1].match(/^title\s*=\s*"(.+)"/m);
  return titleMatch ? titleMatch[1] : null;
}

async function generateOgImage(title: string, outputPath: string) {
  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          padding: "40px",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
                flex: 1,
                borderRadius: "12px",
                background: "rgba(255,255,255,0.05)",
                padding: "40px 60px",
              },
              children: {
                type: "div",
                props: {
                  style: {
                    fontSize: "48px",
                    fontWeight: 700,
                    color: "#ffffff",
                    textAlign: "center",
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                  },
                  children: title,
                },
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "flex-end",
                width: "100%",
                marginTop: "12px",
              },
              children: {
                type: "div",
                props: {
                  style: {
                    fontSize: "24px",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.5)",
                  },
                  children: SITE_NAME,
                },
              },
            },
          },
        ],
      },
    },
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        {
          name: "Noto Sans JP",
          data: fontData,
          weight: 700,
          style: "normal",
        },
      ],
    }
  );

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: WIDTH },
  });
  const png = resvg.render().asPng();
  writeFileSync(outputPath, png);
}

async function main() {
  mkdirSync(outputDir, { recursive: true });

  const files = globSync(join(contentDir, "**/*.md"));

  for (const file of files) {
    const filename = basename(file, ".md");
    if (filename === "_index") continue;

    const content = readFileSync(file, "utf-8");
    const title = extractTitle(content);
    if (!title) continue;

    const outputPath = join(outputDir, `${filename}.png`);
    await generateOgImage(title, outputPath);
    console.log(`Generated: ${outputPath}`);
  }
}

main().catch(console.error);
