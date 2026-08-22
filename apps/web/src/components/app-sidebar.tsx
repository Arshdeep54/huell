"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FolderGitIcon, UsersIcon } from "lucide-react";

export function AppSidebar({
  user,
  isOrgAdmin,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  isOrgAdmin: boolean;
}) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-3">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
          Doctor
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem className="animate-rise">
                <SidebarMenuButton render={<Link href="/dashboard" />} isActive={pathname === "/dashboard"}>
                  <FolderGitIcon />
                  <span>Projects</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isOrgAdmin && (
                <SidebarMenuItem className="animate-rise" style={{ animationDelay: "40ms" }}>
                  <SidebarMenuButton
                    render={<Link href="/dashboard/members" />}
                    isActive={pathname === "/dashboard/members"}
                  >
                    <UsersIcon />
                    <span>Members</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-3 py-3">
        <div className="flex items-center gap-2">
          <Avatar className="size-7">
            <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
            <AvatarFallback>{(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
