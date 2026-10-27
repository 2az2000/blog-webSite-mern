import { ArticleEditor } from "@/components/admin/article-editor";

export default async function EditArticlePage({ params }: PageProps<"/admin/articles/[id]">) {
  return <ArticleEditor id={(await params).id} />;
}
