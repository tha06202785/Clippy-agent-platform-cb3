"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Mail, Shield, Crown, User, MoreHorizontal, ChevronDown } from "lucide-react";

interface TeamMember {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
}

interface OrgInfo {
  name: string;
  plan: string;
  member_count: number;
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("agent");
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.json()),
      fetch("/api/integrations/status").then(r => r.json()).catch(() => []),
    ]).then(([meData, _]) => {
      // Real implementation: fetch org members via a dedicated endpoint
      // Fetch real org members
      fetch("/api/team/members")
        .then(r => r.json())
        .then(membersData => {
          if (Array.isArray(membersData)) {
            setMembers(membersData);
            setOrg({ name: membersData[0]?.org_name || "Your Agency", plan: "professional", member_count: membersData.length });
          }
        })
        .catch(() => {});
      setOrg({ name: "Your Agency", plan: "professional", member_count: 1 });
    }).catch(() => {
      setMembers([]);
    }).finally(() => setLoading(false));
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (res.ok) {
        setMembers(prev => [...prev, { user_id: "pending", full_name: null, email: inviteEmail, phone: null, role: inviteRole, avatar_url: null, created_at: new Date().toISOString() }]);
      }
    } catch {}
    setInviting(false);
    setInviteEmail("");
    setShowInvite(false);
  };

  const roleColors: Record<string, string> = {
    owner: "bg-amber-100 text-amber-700",
    admin: "bg-purple-100 text-purple-700",
    manager: "bg-blue-100 text-blue-700",
    agent: "bg-slate-100 text-slate-700",
  };

  const roleLabels: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    manager: "Manager",
    agent: "Agent",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team</h1>
          <p className="text-muted-foreground mt-1">
            {org ? `${org.name} · ${org.plan} plan` : "Manage your agency team"}
          </p>
        </div>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Invite member
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Invite a team member</h3>
          <div className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleInvite()}
              placeholder="colleague@agency.com.au"
              className="flex-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="agent">Agent</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {inviting ? (
                <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /></>
              ) : (
                <><Mail className="w-4 h-4" /> Send invite</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Member list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Users className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">
            {members.length || 1} member{members.length !== 1 ? "s" : ""}
          </h2>
        </div>

        {/* Current user placeholder */}
        <div className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                You
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                  <Crown className="w-3 h-3" /> Owner
                </span>
              </p>
              <p className="text-xs text-muted-foreground">You own this agency</p>
            </div>
          </div>
        </div>

        {members.length === 0 && (
          <div className="p-8 text-center">
            <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No other team members yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Invite agents to collaborate on leads and listings.</p>
            <button onClick={() => setShowInvite(true)}
              className="mt-4 text-sm text-primary font-semibold hover:underline">
              + Invite your first teammate
            </button>
          </div>
        )}
      </div>

      {/* Permissions info */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Role permissions
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { role: "Agent", desc: "Manage own leads & listings", color: "bg-slate-100 text-slate-700" },
            { role: "Manager", desc: "View & reassign all leads", color: "bg-blue-100 text-blue-700" },
            { role: "Admin", desc: "Full access, invite members", color: "bg-purple-100 text-purple-700" },
          ].map(({ role, desc, color }) => (
            <div key={role} className="rounded-lg border border-border p-3">
              <p className={"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold mb-2 " + color}>{role}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
