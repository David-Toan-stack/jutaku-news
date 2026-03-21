import { redirect } from "next/navigation";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const decoded = decodeURIComponent(category);
  redirect(`/industry?category=${encodeURIComponent(decoded)}`);
}
