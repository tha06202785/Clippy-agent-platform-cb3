"use client";

import Image, { type ImageLoader } from "next/image";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Crown, Mail, Plus, Shield, User, Users } from "lucide-react";
import { Button, EmptyState, Input, LoadingState, Select } from "@clippy/ui";

type Member = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
  is_current_user?: boolean;
};

type Org = { name: string; plan: string; member_count: number };

const passthroughImageLoader: ImageLoader = ({ src }) => src;

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("agent");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const response = await fetch("/api/team/members", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Team could not be loaded");
    }
    setMembers(data.members || []);
    setOrg(data.org || null);
  }, []);

  useEffect(() => {
    void load()
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error ? reason.message : "Team could not be loaded",
        ),
      )
      .finally(() => setLoading(false));
  }, [load]);

  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Invite failed");
      await load();
      setInviteEmail("");
      setShowInvite(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  };

  if (loading) return <LoadingState label="Loading team" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team</h2>
          <p className="text-sm text-muted-foreground">
            {org ? `${org.name} · ${org.plan} plan` : "Manage your agency team"}
          </p>
        </div>
        <Button
          onClick={() => setShowInvite((current) => !current)}
          aria-expanded={showInvite}
          aria-controls="team-invite-form"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Invite member
        </Button>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      {showInvite ? (
        <form
          id="team-invite-form"
          onSubmit={invite}
          className="grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-[1fr_10rem_auto]"
        >
          <div>
            <label htmlFor="invite-email" className="sr-only">
              Colleague email
            </label>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="colleague@agency.com.au"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label htmlFor="invite-role" className="sr-only">
              Team role
            </label>
            <Select
              id="invite-role"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value)}
            >
              <option value="agent">Agent</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          <Button
            type="submit"
            isLoading={inviting}
            loadingText="Sending…"
            disabled={!inviteEmail.trim()}
          >
            <Mail className="h-4 w-4" aria-hidden="true" /> Send invite
          </Button>
        </form>
      ) : null}

      <section
        className="overflow-hidden rounded-xl border border-border bg-card"
        aria-labelledby="team-members-title"
      >
        <div className="flex items-center gap-2 border-b border-border p-4">
          <Users className="h-5 w-5" aria-hidden="true" />
          <h2 id="team-members-title" className="font-semibold">
            {members.length} member{members.length === 1 ? "" : "s"}
          </h2>
        </div>
        {members.length ? (
          <ul>
            {members.map((member) => (
              <li
                key={member.user_id}
                className="flex items-center justify-between gap-3 border-b border-border p-4 last:border-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                    {member.avatar_url ? (
                      <Image
                        loader={passthroughImageLoader}
                        unoptimized
                        src={member.avatar_url}
                        alt=""
                        width={40}
                        height={40}
                        className="h-10 w-10 object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {member.full_name || member.email || "Invited member"}{" "}
                      {member.is_current_user ? (
                        <span className="text-xs text-muted-foreground">
                          (you)
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.email || "Invitation pending"}
                    </p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs capitalize">
                  {member.role === "owner" ? (
                    <Crown className="h-3 w-3" aria-hidden="true" />
                  ) : null}
                  {member.role}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            compact
            icon={Users}
            title="No team members found"
            description="Invite a colleague to start collaborating in this agency workspace."
            className="m-4"
          />
        )}
      </section>

      <section
        className="rounded-xl border border-border bg-card p-5"
        aria-labelledby="team-permissions-title"
      >
        <h2
          id="team-permissions-title"
          className="flex items-center gap-2 font-semibold"
        >
          <Shield className="h-4 w-4" aria-hidden="true" /> Permissions
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Owners and admins can invite members. Database policies enforce
          organisation access for every member.
        </p>
      </section>
    </div>
  );
}
