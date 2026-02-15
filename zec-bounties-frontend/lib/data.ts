export type BountyStatus =
  | "open"
  | "in-progress"
  | "review"
  | "completed"
  | "cancelled";
export type BountyCategory =
  | "Design and Videos"
  | "Writing and Research"
  | "Web Development";

export interface Bounty {
  id: string;
  title: string;
  description: string;
  reward: number;
  currency: string;
  status: BountyStatus;
  category: BountyCategory;
  difficulty: "Easy" | "Medium" | "Hard";
  issuer: {
    name: string;
    avatar: string;
  };
  assignee?: {
    name: string;
    avatar: string;
  };
  createdAt: string;
  submissions: number;
  flagged?: boolean;
  flagReason?: string;
}

export interface Dispute {
  id: string;
  bountyId: string;
  bountyTitle: string;
  issuer: string;
  hunter: string;
  reason: string;
  status: "open" | "resolved" | "escalated";
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  type: "client" | "hunter";
  totalEarnings: number;
  completedBounties: number;
  status: "active" | "suspended" | "pending";
  joinedAt: string;
  avatar: string;
}

export const DUMMY_BOUNTIES: Bounty[] = [
  {
    id: "1",
    title: "Implement Real-time Collaborative Editor",
    description:
      "Build a multi-user collaborative text editor using CRDTs or operational transforms.",
    reward: 2500,
    currency: "USD",
    status: "open",
    category: "Web Development",
    difficulty: "Hard",
    issuer: { name: "Vercel", avatar: "/vercel-logo.png" },
    createdAt: "2024-01-15T10:00:00Z",
    submissions: 3,
  },
  {
    id: "2",
    title: "Security Audit for Smart Contracts",
    description: "Deep security audit for our core liquidity pool contracts.",
    reward: 5000,
    currency: "USDC",
    status: "in-progress",
    category: "Design and Videos",
    difficulty: "Hard",
    issuer: { name: "Uniswap", avatar: "/uniswap-concept.png" },
    assignee: {
      name: "Sarah Chen",
      avatar:
        "/diverse-group-avatars.png?height=32&width=32&query=female-developer-1",
    },
    createdAt: "2024-01-14T08:30:00Z",
    submissions: 1,
  },
  {
    id: "3",
    title: "Optimize Next.js Image Component for SVG",
    description:
      "Improve performance when handling complex SVG paths in the next/image wrapper.",
    reward: 800,
    currency: "USD",
    status: "open",
    category: "Web Development",
    difficulty: "Medium",
    issuer: { name: "Next.js Team", avatar: "/nextjs-logo.png" },
    flagged: true,
    flagReason: "Duplicate submission detected",
    createdAt: "2024-01-16T15:45:00Z",
    submissions: 12,
  },
  {
    id: "4",
    title: "Train LLM on Custom Documentation",
    description:
      "Fine-tune a Llama 3 model on our extensive internal technical docs.",
    reward: 3200,
    currency: "USD",
    status: "review",
    category: "Writing and Research",
    difficulty: "Hard",
    issuer: { name: "Meta", avatar: "/abstract-meta.png" },
    createdAt: "2024-01-12T12:00:00Z",
    submissions: 5,
  },
  {
    id: "5",
    title: "Build a Cross-platform Flutter Plugin",
    description:
      "Create a plugin for native Bluetooth communication on iOS and Android.",
    reward: 1500,
    currency: "USD",
    status: "open",
    category: "Design and Videos",
    difficulty: "Medium",
    issuer: { name: "Google", avatar: "/google-homepage.png" },
    createdAt: "2024-01-17T09:15:00Z",
    submissions: 0,
  },
  {
    id: "6",
    title: "Database Performance Optimization",
    description: "Reduce query latency for our main PostgreSQL cluster by 40%.",
    reward: 2000,
    currency: "USD",
    status: "completed",
    category: "Web Development",
    difficulty: "Hard",
    issuer: { name: "Neon", avatar: "/neon-sign.png" },
    createdAt: "2024-01-10T11:20:00Z",
    submissions: 8,
  },
];

export const DUMMY_DISPUTES: Dispute[] = [
  {
    id: "d1",
    bountyId: "1",
    bountyTitle: "Implement Real-time Collaborative Editor",
    issuer: "Vercel",
    hunter: "Alex Rodriguez",
    reason: "Deliverable does not meet specifications",
    status: "open",
    createdAt: "2024-01-15T14:00:00Z",
  },
  {
    id: "d2",
    bountyId: "4",
    bountyTitle: "Train LLM on Custom Documentation",
    issuer: "Meta",
    hunter: "Jordan Smith",
    reason: "Payment not received after completion",
    status: "escalated",
    createdAt: "2024-01-13T10:30:00Z",
  },
];

export const DUMMY_USERS: User[] = [
  {
    id: "u1",
    name: "Sarah Chen",
    email: "sarah@example.com",
    type: "hunter",
    totalEarnings: 24500,
    completedBounties: 12,
    status: "active",
    joinedAt: "2023-06-15T00:00:00Z",
    avatar: "/diverse-group-avatars.png",
  },
  {
    id: "u2",
    name: "Alex Rodriguez",
    email: "alex@example.com",
    type: "hunter",
    totalEarnings: 18200,
    completedBounties: 8,
    status: "active",
    joinedAt: "2023-08-20T00:00:00Z",
    avatar: "/diverse-group-avatars.png",
  },
  {
    id: "u3",
    name: "Jordan Smith",
    email: "jordan@example.com",
    type: "client",
    totalEarnings: 0,
    completedBounties: 0,
    status: "active",
    joinedAt: "2024-01-01T00:00:00Z",
    avatar: "/diverse-group-avatars.png",
  },
  {
    id: "u4",
    name: "Emily Zhang",
    email: "emily@example.com",
    type: "hunter",
    totalEarnings: 32100,
    completedBounties: 15,
    status: "suspended",
    joinedAt: "2023-04-10T00:00:00Z",
    avatar: "/diverse-group-avatars.png",
  },
  {
    id: "u5",
    name: "Marcus Johnson",
    email: "marcus@example.com",
    type: "client",
    totalEarnings: 0,
    completedBounties: 0,
    status: "pending",
    joinedAt: "2024-01-18T00:00:00Z",
    avatar: "/diverse-group-avatars.png",
  },
];

export const bounties = DUMMY_BOUNTIES;
