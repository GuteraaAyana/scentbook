import type { Metadata } from "next";
import { Suspense } from "react";
import { FollowList } from "@/components/follow-list-page";
import { pageContainer } from "@/lib/ui";

export async function generateMetadata(props: PageProps<"/u/[username]/following">): Promise<Metadata> {
  const { username } = await props.params;
  return { title: `Following of @${username.toLowerCase()} · Scentbook` };
}

export default function FollowingPage(props: PageProps<"/u/[username]/following">) {
  return (
    <main className={`${pageContainer} flex-1 py-8 sm:py-10`}>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Following</h1>
      <Suspense fallback={<p className="mt-3 text-muted">Loading…</p>}>
        <List params={props.params} />
      </Suspense>
    </main>
  );
}

async function List({ params }: Pick<PageProps<"/u/[username]/following">, "params">) {
  const { username } = await params;
  return <FollowList username={username} direction="following" />;
}
