"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Moon,
  Sun,
  Bell,
  Search,
  Terminal,
  Wallet,
  Menu,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Link from "next/link";
import { useState } from "react";
import { WalletTopupModal } from "@/components/wallet-topup-modal";
import { useBounty } from "@/lib/bounty-context";

export function Navbar({
  isAdmin = false,
  searchQuery,
  onSearchChange,
}: {
  isAdmin?: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}) {
  const { theme, setTheme } = useTheme();
  const [topupOpen, setTopupOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [zecBalance] = useState(0.0);
  const { currentUser, logout } = useBounty();

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 md:px-6">
          <Link href="/home" className="transition-colors hover:text-primary">
            <div className="flex items-center gap-2 font-bold text-xl tracking-tight mr-4 md:mr-6">
              <img
                src="ZecHubBlue.png"
                alt="ZecHubBlue.png"
                style={{ height: "3rem" }}
              />
              <span className="hidden sm:inline">ZEC Bounties</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-4 text-sm font-medium mr-auto">
            {!isAdmin && (
              <Link
                href="/dashboard"
                className="transition-colors hover:text-primary"
              >
                Dashboard
              </Link>
            )}
            <Link
              href="/my-bounties"
              className="transition-colors hover:text-primary"
            >
              My Bounties
            </Link>
            {/* <Link
              href="/leaderboard"
              className="transition-colors hover:text-primary"
            >
              Leaderboard
            </Link> */}
            {isAdmin && (
              <Link
                href="/admin"
                className="transition-colors text-primary font-bold"
              >
                Admin Console
              </Link>
            )}
          </div>

          {/* Desktop Right Side */}
          <div className="hidden lg:flex items-center gap-3 ml-auto">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search bounties..."
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="pl-8 h-9 w-[200px] lg:w-[300px] bg-muted/50 border-none focus-visible:ring-1"
              />
            </div>

            {isAdmin && (
              <Button
                variant="ghost"
                className="gap-2 h-9 text-xs font-mono"
                onClick={() => setTopupOpen(true)}
              >
                <Wallet className="h-4 w-4" />
                {zecBalance.toFixed(4)} ZEC
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9"
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Bell className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={
                        currentUser?.avatar || "/abstract-geometric-shapes.png"
                      }
                      alt="User"
                    />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{currentUser?.name}</DropdownMenuLabel>
                {/* <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Billing</DropdownMenuItem>
                <DropdownMenuItem>Team</DropdownMenuItem>
                <DropdownMenuSeparator /> */}
                <DropdownMenuItem asChild>
                  <div onClick={logout}>Log out</div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Right Side */}
          <div className="flex lg:hidden items-center gap-2 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9"
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] p-4">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-6">
                  {/* Mobile Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search bounties..."
                      value={searchQuery}
                      onChange={(e) => onSearchChange?.(e.target.value)}
                      className="pl-8 bg-muted/50 border-none focus-visible:ring-1"
                    />
                  </div>

                  {/* Mobile Navigation Links */}
                  <div className="flex flex-col gap-2">
                    {!isAdmin && (
                      <Link
                        href="/dashboard"
                        className="px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                    )}
                    <Link
                      href="/my-bounties"
                      className="px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Bounties
                    </Link>
                    {/* <Link
                      href="/leaderboard"
                      className="px-3 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Leaderboard
                    </Link> */}
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="px-3 py-2 text-sm font-bold text-primary rounded-md hover:bg-accent transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Admin Console
                      </Link>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t" />

                  {/* Mobile Wallet (Admin only) */}
                  {isAdmin && (
                    <Button
                      variant="outline"
                      className="gap-2 justify-start font-mono"
                      onClick={() => {
                        setTopupOpen(true);
                        setMobileMenuOpen(false);
                      }}
                    >
                      <Wallet className="h-4 w-4" />
                      {zecBalance.toFixed(4)} ZEC
                    </Button>
                  )}

                  {/* Mobile Notifications */}
                  <Button variant="outline" className="gap-2 justify-start">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </Button>

                  {/* Divider */}
                  <div className="border-t" />

                  {/* Mobile User Menu */}
                  <div className="flex items-center gap-3 px-3 py-2">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={
                          currentUser?.avatar ||
                          "/abstract-geometric-shapes.png"
                        }
                        alt="User"
                      />
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {currentUser?.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    {/* <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Profile
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Billing
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Team
                    </Button> */}
                    <div className="border-t my-2" />
                    <Button
                      variant="ghost"
                      className="justify-start text-destructive"
                      asChild
                    >
                      <div onClick={logout}>Log out</div>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
      {isAdmin && (
        <WalletTopupModal open={topupOpen} onOpenChange={setTopupOpen} />
      )}
    </>
  );
}
