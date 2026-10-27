/**
 * One-off bridge: snapshots the front end's mock content (web/src/data/mock)
 * into backend/seed/*.json, which is what `npm run seed:content` loads.
 * Run it only when the web mock changes — once the site reads this API the
 * JSON in backend/seed becomes the single source and the mock is retired.
 *
 *   npx tsx scripts/export-web-mock.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const mock = (name: string) => pathToFileURL(resolve("..", "web", "src", "data", "mock", `${name}.ts`)).href;

async function main(): Promise<void> {
  const [articles, authors, sections, topics, bodies] = await Promise.all([
    import(mock("articles")),
    import(mock("authors")),
    import(mock("sections")),
    import(mock("topics")),
    import(mock("bodies")),
  ]);

  await mkdir("seed", { recursive: true });
  const write = (file: string, data: unknown) => writeFile(`seed/${file}.json`, JSON.stringify(data, null, 2) + "\n");

  await write("articles", articles.articles);
  await write("authors", Object.values(authors.authors));
  await write("sections", Object.values(sections.sections));
  await write("topics", Object.values(topics.topics));
  await write("details", { article: bodies.defaultArticleDetail, longform: bodies.longformDetails });

  console.log(
    `exported ${articles.articles.length} articles, ${Object.keys(authors.authors).length} authors, ` +
      `${Object.keys(sections.sections).length} sections, ${Object.keys(topics.topics).length} topics`,
  );
}

void main();
