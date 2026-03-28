import { redirect } from 'next/navigation';

export default async function PlaygroundPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: rawHandle } = await params;
  const handle = rawHandle.replace(/^@+/, '');
  redirect(`/builder/new-tab?handle=${encodeURIComponent(handle)}`);
}
