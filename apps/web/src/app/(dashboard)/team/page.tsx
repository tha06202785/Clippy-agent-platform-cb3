"use client";

import Image, { type ImageLoader } from "next/image";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import {
  Activity,
  ChevronDown,
  Crown,
  Eye,
  Mail,
  Plus,
  Shield,
  User,
  Users,
} from "lucide-react";
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
  activity: {
    actions_last_24_hours: number;
    last_active_at: string | null;
    recent: Array<{
      category: string;
      title: string;
      impact_summary: string | null;
      occurred_at: string;
    }>;
  } | null;
};

type Org = { name: string; plan: string; member_count: number };
type Permissions = {
  can_manage_team: boolean;
  can_view_team_activity: boolean;
};

const passthroughImageLoader: ImageLoader = ({ src }) => src;

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [org, setOrg] = useState<Org | null>(null);
  const [permissions, setPermissions] = useState<Permissions>({
    can_manage_team: false,
    can_view_team_activity: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("agent");
  const [inviting, setInviting] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const response = await fetch("/api/team/members", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Team could not be loaded");
    }
    setMembers(data.members || []);
    setOrg(data.org || null);
    setPermissions(
      data.permissions || {
        can_manage_team: false,
        can_view_team_activity: false,
      },
    );
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
        {permissions.can_manage_team ? (
          <Button
            onClick={() => setShowInvite((current) => !current)}
            aria-expanded={showInvite}
            aria-controls="team-invite-form"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Invite member
          </Button>
        ) : null}
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
                className="border-b border-border p-4 last:border-0"
              >
                <div className="flex items-center justify-between gap-3">
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
                      {permissions.can_view_team_activity && member.activity ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {member.activity.actions_last_24_hours} Clippy action
                          {member.activity.actions_last_24_hours === 1
                            ? ""
                            : "s"}{" "}
                          in the last 24 hours
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs capitalize">
                      {member.role === "owner" ? (
                        <Crown className="h-3 w-3" aria-hidden="true" />
                      ) : null}
                      {member.role}
                    </span>
                    {permissions.can_view_team_activity ? (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedMember((current) =>
                            current === member.user_id ? null : member.user_id,
                          )
                        }
                        aria-expanded={expandedMember === member.user_id}
                        aria-controls={`member-activity-${member.user_id}`}
                        className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium text-foreground hover:bg-muted"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="hidden sm:inline">View activity</span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${
                            expandedMember === member.user_id
                              ? "rotate-180"
                              : ""
                          }`}
                          aria-hidden="true"
                        />
                      </button>
                    ) : null}
                  </div>
                </div>

                {permissions.can_view_team_activity &&
                expandedMember === member.user_id ? (
                  <div
                    id={`member-activity-${member.user_id}`}
                    className="mt-4 rounded-xl border border-border bg-muted/35 p-4"
                  >
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" aria-hidden="true" />
                      <h3 className="text-sm font-semibold">
                        Recent Clippy activity
                      </h3>
                      <span className="ml-auto text-xs text-muted-foreground">
                        Read only
                      </span>
                    </div>
                    {member.activity?.recent.length ? (
                      <ul className="mt-3 space-y-2">
                        {member.activity.recent.map((item, index) => (
                          <li
                            key={`${item.occurred_at}-${index}`}
                            className="rounded-lg bg-background p-3"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium">
                                {item.title}
                              </p>
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
                                {item.category}
                              </span>
                            </div>
                            {item.impact_summary ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {item.impact_summary}
                              </p>
                            ) : null}
                            <time
                              dateTime={item.occurred_at}
                              className="mt-1 block text-[11px] text-muted-foreground"
                            >
                              {new Date(item.occurred_at).toLocaleString()}
                            </time>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">
                        No recorded Clippy activity in the last 30 days.
                      </p>
                    )}
                  </div>
                ) : null}
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
          Owners and admins can invite members. Managers can review team
          activity without signing into another agent&apos;s account. Database
          policies enforce organisation access for every member.
        </p>
      </section>
    </div>
  );
}
