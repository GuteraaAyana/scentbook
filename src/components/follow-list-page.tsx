import { notFound } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { PersonList } from "@/components/people";
import { listFollowPeople } from "@/db/follows";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// Shared body of /u/[username]/followers and /u/[username]/following.
export async function FollowList({ username, direction }: { username: string; direction: "followers" | "following" }) {
  await connection();
  const [user] = await db
    .select({ id: users.id, name: users.name, username: users.username })
    .from(users)
    .where(eq(users.username, username.toLowerCase()));
  if (!user) notFound();

  const people = await listFollowPeople(user.id, direction);
  const firstName = user.name.split(" ")[0];
  return (
    <>
      <p className="mt-2 text-muted">
        <Link href={`/u/${user.username}`} className="font-bold text-foreground hover:underline hover:underline-offset-4">
          {user.name}
        </Link>
        {direction === "followers" ? " is followed by" : " follows"}
      </p>
      <div className="mt-4 max-w-2xl">
        <PersonList
          people={people}
          empty={direction === "followers" ? `Nobody follows ${firstName} yet.` : `${firstName} doesn't follow anyone yet.`}
        />
      </div>
    </>
  );
}
