"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Mail, Shield, Crown, User } from "lucide-react";

type Member = { user_id:string; full_name:string|null; email:string|null; phone:string|null; role:string; avatar_url:string|null; created_at:string; is_current_user?:boolean };
type Org = { name:string; plan:string; member_count:number };

export default function TeamPage() {
  const [members,setMembers]=useState<Member[]>([]);
  const [org,setOrg]=useState<Org|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [showInvite,setShowInvite]=useState(false);
  const [inviteEmail,setInviteEmail]=useState("");
  const [inviteRole,setInviteRole]=useState("agent");
  const [inviting,setInviting]=useState(false);

  const load=async()=>{
    setError(null);
    const response=await fetch("/api/team/members");
    const data=await response.json();
    if(!response.ok) throw new Error(data.error||"Team could not be loaded");
    setMembers(data.members||[]); setOrg(data.org||null);
  };
  useEffect(()=>{ load().catch(e=>setError(e.message)).finally(()=>setLoading(false)); },[]);

  const invite=async()=>{
    setInviting(true); setError(null);
    try{
      const response=await fetch("/api/auth/invite",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:inviteEmail,role:inviteRole})});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||"Invite failed");
      await load(); setInviteEmail(""); setShowInvite(false);
    }catch(e){setError(e instanceof Error?e.message:"Invite failed");}
    finally{setInviting(false);}
  };

  if(loading) return <div className="p-6 text-sm text-muted-foreground">Loading team…</div>;
  return <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div><h1 className="text-2xl font-bold">Team</h1><p className="text-sm text-muted-foreground">{org?org.name+" · "+org.plan+" plan":"Manage your agency team"}</p></div>
      <button onClick={()=>setShowInvite(v=>!v)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold"><Plus className="w-4 h-4"/>Invite member</button>
    </div>
    {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {showInvite&&<div className="rounded-xl border bg-card p-5 flex gap-3">
      <input type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="colleague@agency.com.au" className="flex-1 px-4 py-2 rounded-xl border"/>
      <select value={inviteRole} onChange={e=>setInviteRole(e.target.value)} className="px-3 py-2 rounded-xl border"><option value="agent">Agent</option><option value="manager">Manager</option><option value="admin">Admin</option></select>
      <button onClick={invite} disabled={inviting||!inviteEmail.trim()} className="px-5 py-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-50"><Mail className="inline w-4 h-4 mr-2"/>{inviting?"Sending…":"Send invite"}</button>
    </div>}
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="p-4 border-b flex items-center gap-2"><Users className="w-5 h-5"/><strong>{members.length} member{members.length===1?"":"s"}</strong></div>
      {members.map(member=><div key={member.user_id} className="p-4 border-b last:border-0 flex items-center justify-between">
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">{member.avatar_url?<img src={member.avatar_url} alt="" className="w-10 h-10 rounded-full"/>:<User className="w-5 h-5"/>}</div>
          <div><p className="text-sm font-medium">{member.full_name||member.email||"Invited member"} {member.is_current_user&&<span className="text-xs text-muted-foreground">(you)</span>}</p><p className="text-xs text-muted-foreground">{member.email||"Invitation pending"}</p></div></div>
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs capitalize">{member.role==="owner"&&<Crown className="w-3 h-3"/>}{member.role}</span>
      </div>)}
      {!members.length&&<div className="p-8 text-center text-sm text-muted-foreground">No team members found.</div>}
    </div>
    <div className="rounded-xl border bg-card p-5"><h3 className="flex items-center gap-2 font-semibold"><Shield className="w-4 h-4"/>Permissions</h3><p className="mt-2 text-sm text-muted-foreground">Owners and admins can invite members. Database policies enforce organisation access for every member.</p></div>
  </div>;
}
