"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FollowButton({ targetUserId, initiallyFollowing }: { targetUserId: string; initiallyFollowing: boolean }) {
  const router = useRouter();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    if (following) {
      await fetch(`/api/follow?targetUserId=${targetUserId}`, { method: "DELETE" });
    } else {
      await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
    }
    setFollowing(!following);
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={following ? "btn-secondary" : "btn"}
    >
      {loading ? "…" : following ? "Following" : "Follow"}
    </button>
  );
}
