"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, Users, DollarSign, Clock } from "lucide-react";
import { DashboardPage } from "@/components/dashboard-page";

export default function Dashboard() {
  return <DashboardPage />;
}
