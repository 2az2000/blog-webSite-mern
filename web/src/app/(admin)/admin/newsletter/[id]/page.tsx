import { IssueEditor } from "@/components/admin/issue-editor";

export default async function AdminIssuePage({ params }: PageProps<"/admin/newsletter/[id]">) {
  return <IssueEditor id={(await params).id} />;
}
