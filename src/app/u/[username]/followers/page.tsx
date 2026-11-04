import type { Metadata } from "next";
import { Suspense } from "react";
import { FollowList } from "@/components/follow-list-page";
import { pageContainer } from "@/lib/ui";

export async function generateMetadata(props: PageProps<"/u/[username]/followers">): Promise<Metadata> {
  const { username } = await props.params;
  return { title: `Followers of @${username.toLowerCase()} · Scentbook` };
}

export default function FollowersPage(props: PageProps<"/u/[username]/followers">) {
  return (
    <main className={`${pageContainer} flex-1 py-8 sm:py-10`}>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Followers</h1>
      <Suspense fallback={<p className="mt-3 text-muted">Loading…</p>}>
        <List params={props.params} />
      </Suspense>
    </main>
  );
}

async function List({ params }: Pick<PageProps<"/u/[username]/followers">, "params">) {
  const { username } = await params;
  return <FollowList username={username} direction="followers" />;
}
