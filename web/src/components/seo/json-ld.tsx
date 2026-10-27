/**
 * Structured data for search engines. `<` is escaped so that a title containing
 * `</script>` can never end the tag early.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
